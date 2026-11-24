package com.luachill.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Process
import org.json.JSONObject

data class UsageResult(val day: String, val totalMinutes: Int, val perAppMinutes: Map<String, Int>)

object UsageTracker {
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

    fun compute(ctx: Context, p: BlockPolicy): UsageResult {
        val day = PolicyStore.dayKey(p)
        if (!hasPermission(ctx) || p.blockedPkgs.isEmpty()) {
            return UsageResult(day, 0, emptyMap())
        }
        val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val start = minOf(now, PolicyStore.gameDayStartMs(p))
        val totalsMs = mutableMapOf<String, Long>()
        val openAt = mutableMapOf<String, Long>()
        try {
            val events = usm.queryEvents(start, now)
            val ev = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(ev)
                val pkg = ev.packageName ?: continue
                if (pkg !in p.blockedPkgs) continue
                when (ev.eventType) {
                    UsageEvents.Event.ACTIVITY_RESUMED -> openAt[pkg] = ev.timeStamp
                    UsageEvents.Event.ACTIVITY_PAUSED, UsageEvents.Event.ACTIVITY_STOPPED -> {
                        val t0 = openAt.remove(pkg)
                        if (t0 != null && ev.timeStamp > t0) {
                            totalsMs[pkg] = (totalsMs[pkg] ?: 0L) + (ev.timeStamp - t0)
                        }
                    }
                }
            }
            for ((pkg, t0) in openAt) {
                if (now > t0) totalsMs[pkg] = (totalsMs[pkg] ?: 0L) + (now - t0)
            }
        } catch (_: Exception) {}

        val perApp = mutableMapOf<String, Int>()
        var sumMs = 0L
        for ((pkg, ms) in totalsMs) {
            sumMs += ms
            val mins = (ms / 60_000L).toInt()
            if (mins > 0) perApp[appLabel(ctx, pkg)] = mins
        }
        return UsageResult(day, (sumMs / 60_000L).toInt(), perApp)
    }

    fun toJson(ctx: Context): String {
        val p = PolicyStore.load(ctx)
        val u = compute(ctx, p)
        val root = JSONObject()
        root.put("day", u.day)
        root.put("minutes", u.totalMinutes)
        val apps = JSONObject()
        for ((k, v) in u.perAppMinutes) apps.put(k, v)
        root.put("apps", apps)
        return root.toString()
    }
}
