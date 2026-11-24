package com.luachill.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Process
import org.json.JSONObject

data class UsageResult(
    val day: String,
    val totalMinutes: Int,
    val trackedMinutes: Int,
    val perPkgMinutes: Map<String, Int>,
    val allAppLabels: Map<String, Int>,
    val trackedAppLabels: Map<String, Int>
)

object UsageTracker {
    // Hằng số tương thích đầy đủ từ API 26 → 34 (không gây cảnh báo @RequiresApi)
    private const val EV_RESUMED = 1          // MOVE_TO_FOREGROUND / ACTIVITY_RESUMED
    private const val EV_PAUSED = 2           // MOVE_TO_BACKGROUND / ACTIVITY_PAUSED
    private const val EV_SCREEN_OFF = 16      // SCREEN_NON_INTERACTIVE
    private const val EV_KEYGUARD = 17        // KEYGUARD_SHOWN
    private const val EV_STOPPED = 23         // ACTIVITY_STOPPED
    private const val EV_SHUTDOWN = 26        // DEVICE_SHUTDOWN

    fun hasPermission(ctx: Context): Boolean {
        val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun appLabel(ctx: Context, pkg: String): String {
        return try {
            val pm = ctx.packageManager
            val ai = pm.getApplicationInfo(pkg, 0)
            pm.getApplicationLabel(ai).toString()
        } catch (_: Exception) {
            pkg
        }
    }

    /** Tìm ứng dụng đang hiển thị ở tiền cảnh gần nhất (dự phòng khi thanh thông báo che mất sự kiện Accessibility). */
    fun latestForegroundPkg(ctx: Context): String? {
        if (!hasPermission(ctx)) return null
        val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val exempt = PolicyStore.systemExemptPackages(ctx)
        var active: String? = null
        try {
            val events = usm.queryEvents(now - 120_000L, now)
            val ev = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(ev)
                val pkg = ev.packageName
                when (ev.eventType) {
                    EV_RESUMED -> if (!pkg.isNullOrEmpty()) active = pkg
                    EV_PAUSED, EV_STOPPED -> if (pkg == active) active = null
                    EV_SCREEN_OFF, EV_KEYGUARD, EV_SHUTDOWN -> active = null
                }
            }
        } catch (_: Exception) {}
        return if (active != null && active !in exempt) active else null
    }

    /** Quét THẬT thời gian sử dụng TOÀN BỘ ứng dụng trên điện thoại từ đầu ngày game (tự khớp múi giờ & ngắt khi tắt màn hình). */
    fun compute(ctx: Context, p: BlockPolicy): UsageResult {
        val day = PolicyStore.dayKey(p)
        if (!hasPermission(ctx)) {
            return UsageResult(day, 0, 0, emptyMap(), emptyMap(), emptyMap())
        }
        val exempt = PolicyStore.systemExemptPackages(ctx)
        val trackedSet = when (p.blockMode) {
            "groups" -> p.groups.flatMap { it.pkgs }.toSet()
            else -> p.blockedPkgs
        }
        val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val start = minOf(now, PolicyStore.gameDayStartWallMs(p))
        val totalsMs = mutableMapOf<String, Long>()
        val openAt = mutableMapOf<String, Long>()

        fun closeAll(ts: Long) {
            for ((pkg, t0) in openAt) {
                if (ts > t0) totalsMs[pkg] = (totalsMs[pkg] ?: 0L) + (ts - t0)
            }
            openAt.clear()
        }

        try {
            val events = usm.queryEvents(start, now)
            val ev = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(ev)
                val pkg = ev.packageName
                when (ev.eventType) {
                    EV_RESUMED -> {
                        if (!pkg.isNullOrEmpty() && pkg !in exempt) {
                            openAt[pkg] = ev.timeStamp
                        }
                    }
                    EV_PAUSED, EV_STOPPED -> {
                        if (!pkg.isNullOrEmpty()) {
                            val t0 = openAt.remove(pkg)
                            if (t0 != null && ev.timeStamp > t0) {
                                totalsMs[pkg] = (totalsMs[pkg] ?: 0L) + (ev.timeStamp - t0)
                            }
                        }
                    }
                    EV_SCREEN_OFF, EV_KEYGUARD, EV_SHUTDOWN -> closeAll(ev.timeStamp)
                }
            }
            closeAll(now)
        } catch (_: Exception) {}

        val perPkg = mutableMapOf<String, Int>()
        val allLabels = mutableMapOf<String, Int>()
        val trackedLabels = mutableMapOf<String, Int>()
        var sumAllMs = 0L
        var sumTrackedMs = 0L

        for ((pkg, ms) in totalsMs) {
            sumAllMs += ms
            val mins = (ms / 60_000L).toInt()
            if (mins > 0) {
                perPkg[pkg] = mins
                val lbl = appLabel(ctx, pkg)
                allLabels[lbl] = (allLabels[lbl] ?: 0) + mins
                if (pkg in trackedSet) trackedLabels[lbl] = (trackedLabels[lbl] ?: 0) + mins
            }
            if (pkg in trackedSet) sumTrackedMs += ms
        }

        val totMin = (sumAllMs / 60_000L).toInt()
        val trkMin = if (p.blockMode == "lockdown") totMin else (sumTrackedMs / 60_000L).toInt()
        return UsageResult(day, totMin, trkMin, perPkg, allLabels, trackedLabels)
    }

    fun toJson(ctx: Context): String {
        val p = PolicyStore.load(ctx)
        val u = compute(ctx, p)
        val root = JSONObject()
        root.put("day", u.day)
        root.put("totalMinutes", u.totalMinutes)
        root.put("minutes", u.trackedMinutes)
        val apps = JSONObject()
        for ((k, v) in u.trackedAppLabels) apps.put(k, v)
        root.put("apps", apps)
        val all = JSONObject()
        for ((k, v) in u.allAppLabels) all.put(k, v)
        root.put("allApps", all)
        return root.toString()
    }
}
