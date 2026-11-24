package com.luachill.app

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.view.inputmethod.InputMethodManager
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class AppGroup(
    val id: String,
    val name: String,
    val limit: Int,
    val pkgs: Set<String>
)

data class ReminderCfg(
    val enabled: Boolean = true,
    val quests: Boolean = true,
    val questTime: String = "10:00",
    val questTime2: String = "17:00",
    val checkin: Boolean = true,
    val bed: Boolean = true,
    val bedLead: Int = 15,
    val wake: Boolean = true,
    val limitWarn: Boolean = true,
    val limitLead: Int = 10
)

data class BlockPolicy(
    val limit: Int = 120,
    val extra: Int = 0,
    val usedFloor: Int = 0,
    val screenLocked: Boolean = false,
    val bed: String = "23:00",
    val wake: String = "07:00",
    val brokenNight: String? = null,
    val day: String? = null,
    val offset: Long = 0L,
    val blockMode: String = "apps",
    val blockedPkgs: Set<String> = emptySet(),
    val appLimits: Map<String, Int> = emptyMap(),
    val emergencyPkgs: Set<String> = emptySet(),
    val groups: List<AppGroup> = emptyList(),
    val reminders: ReminderCfg = ReminderCfg()
)

data class BlockDecision(
    val blocked: Boolean,
    val reason: String = "screen",
    val title: String = "",
    val detail: String = ""
)

object PolicyStore {
    private const val PREFS = "luachill_prefs"
    private const val KEY = "policy_json"

    val WHITELIST = setOf(
        "com.luachill.app",
        "com.android.dialer",
        "com.google.android.dialer",
        "com.samsung.android.dialer",
        "com.android.incallui",
        "com.android.phone",
        "com.android.contacts",
        "com.android.systemui",
        "com.android.settings",
        "com.android.permissioncontroller",
        "com.google.android.permissioncontroller"
    )

    fun save(ctx: Context, rawJson: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY, rawJson).apply()
        ReminderScheduler.scheduleAll(ctx)
    }

    fun load(ctx: Context): BlockPolicy {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
            ?: return BlockPolicy()
        return try {
            val j = JSONObject(raw)
            fun readStrSet(key: String): Set<String> {
                val out = mutableSetOf<String>()
                val arr = j.optJSONArray(key) ?: return out
                for (i in 0 until arr.length()) {
                    val s = arr.optString(i).trim()
                    if (s.isNotEmpty() && s !in WHITELIST) out.add(s)
                }
                return out
            }
            val lims = mutableMapOf<String, Int>()
            j.optJSONObject("appLimits")?.let { o ->
                val it = o.keys()
                while (it.hasNext()) {
                    val k = it.next()
                    val v = o.optInt(k, 0)
                    if (v > 0) lims[k] = v
                }
            }
            val grps = mutableListOf<AppGroup>()
            j.optJSONArray("groups")?.let { arr ->
                for (i in 0 until arr.length()) {
                    val g = arr.optJSONObject(i) ?: continue
                    val pkgs = mutableSetOf<String>()
                    g.optJSONArray("pkgs")?.let { pa ->
                        for (k in 0 until pa.length()) {
                            val ps = pa.optString(k).trim()
                            if (ps.isNotEmpty() && ps !in WHITELIST) pkgs.add(ps)
                        }
                    }
                    grps.add(AppGroup(g.optString("id", "g$i"), g.optString("name", "Nhóm"), g.optInt("limit", 30), pkgs))
                }
            }
            val rj = j.optJSONObject("reminders")
            val rem = if (rj != null) ReminderCfg(
                enabled = rj.optBoolean("enabled", true),
                quests = rj.optBoolean("quests", true),
                questTime = rj.optString("questTime", "10:00"),
                questTime2 = rj.optString("questTime2", "17:00"),
                checkin = rj.optBoolean("checkin", true),
                bed = rj.optBoolean("bed", true),
                bedLead = rj.optInt("bedLead", 15),
                wake = rj.optBoolean("wake", true),
                limitWarn = rj.optBoolean("limitWarn", true),
                limitLead = rj.optInt("limitLead", 10)
            ) else ReminderCfg()

            BlockPolicy(
                limit = j.optInt("limit", 120),
                extra = j.optInt("extra", 0),
                usedFloor = j.optInt("usedFloor", 0),
                screenLocked = j.optBoolean("screenLocked", false),
                bed = j.optString("bed", "23:00"),
                wake = j.optString("wake", "07:00"),
                brokenNight = if (j.isNull("brokenNight")) null else j.optString("brokenNight", null),
                day = if (j.isNull("day")) null else j.optString("day", null),
                offset = j.optLong("offset", 0L),
                blockMode = j.optString("blockMode", "apps"),
                blockedPkgs = readStrSet("blockedPkgs"),
                appLimits = lims,
                emergencyPkgs = readStrSet("emergencyPkgs").take(3).toSet(),
                groups = grps,
                reminders = rem
            )
        } catch (_: Exception) {
            BlockPolicy()
        }
    }

    fun homePackage(ctx: Context): String? {
        return try {
            val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            ctx.packageManager.resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
        } catch (_: Exception) {
            null
        }
    }

    fun imePackages(ctx: Context): Set<String> {
        val out = mutableSetOf<String>()
        try {
            val imm = ctx.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.enabledInputMethodList?.forEach { out.add(it.packageName) }
        } catch (_: Exception) {}
        return out
    }

    fun systemExemptPackages(ctx: Context): Set<String> {
        val out = WHITELIST.toMutableSet()
        homePackage(ctx)?.let { out.add(it) }
        out.addAll(imePackages(ctx))
        return out
    }

    fun hmToH(hm: String): Double {
        val parts = hm.split(":")
        val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
        val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
        return h + m / 60.0
    }

    fun nowMs(p: BlockPolicy): Long = System.currentTimeMillis() + p.offset

    fun dayKey(p: BlockPolicy): String {
        val shifted = nowMs(p) - (hmToH(p.wake) * 3600_000.0).toLong()
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(shifted))
    }

    /** Mốc bắt đầu ngày game trong không gian đồng hồ đã áp dụng múi giờ / giờ thủ công. */
    fun gameDayStartMs(p: BlockPolicy): Long {
        val wakeH = hmToH(p.wake)
        val cal = Calendar.getInstance()
        cal.timeInMillis = nowMs(p) - (wakeH * 3600_000.0).toLong()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis + (wakeH * 3600_000.0).toLong()
    }

    /** Mốc bắt đầu ngày game quy đổi về thời gian hệ thống thực (dùng cho UsageStatsManager.queryEvents). */
    fun gameDayStartWallMs(p: BlockPolicy): Long = gameDayStartMs(p) - p.offset

    fun isBedtime(p: BlockPolicy): Boolean {
        val cal = Calendar.getInstance()
        cal.timeInMillis = nowMs(p)
        val h = cal.get(Calendar.HOUR_OF_DAY) + cal.get(Calendar.MINUTE) / 60.0
        val b = hmToH(p.bed)
        val w = hmToH(p.wake)
        return if (b > w) (h >= b || h < w) else (h >= b && h < w)
    }

    fun checkPackage(
        ctx: Context,
        pkg: String,
        p: BlockPolicy = load(ctx),
        usage: UsageResult = UsageTracker.compute(ctx, p)
    ): BlockDecision {
        if (pkg in systemExemptPackages(ctx)) return BlockDecision(false)
        val day = dayKey(p)
        val bed = isBedtime(p) && p.brokenNight != day
        val label = UsageTracker.appLabel(ctx, pkg)
        val pkgMins = usage.perPkgMinutes[pkg] ?: 0

        /* Mỗi chế độ dùng 1 cơ chế khóa riêng biệt, không áp chồng giới hạn hằng ngày lên từng app / nhóm app */
        return when (p.blockMode) {
            "lockdown" -> {
                if (pkg in p.emergencyPkgs) return BlockDecision(false)
                val lim = p.limit + p.extra
                val usedTotal = maxOf(usage.totalMinutes, if (p.day == day) p.usedFloor else 0)
                val dailyOut = (p.screenLocked && p.day == day) || usedTotal >= lim
                if (bed) BlockDecision(true, "bed", "$label đang bị khóa giờ ngủ", "Giờ ngủ 8 tiếng (${p.bed} → ${p.wake}). Chỉ tối đa 3 app khẩn cấp được phép dùng.")
                else if (dailyOut) BlockDecision(true, "screen", "Đã chạm giới hạn hằng ngày!", "Bạn đã dùng $usedTotal/$lim phút hôm nay. Chế độ Khóa toàn bộ hằng ngày chỉ mở 3 app khẩn cấp.")
                else BlockDecision(false)
            }
            "groups" -> {
                val grp = p.groups.firstOrNull { pkg in it.pkgs } ?: return BlockDecision(false)
                val gLim = grp.limit + p.extra
                val gMins = grp.pkgs.sumOf { usage.perPkgMinutes[it] ?: 0 }
                if (bed) BlockDecision(true, "bed", "$label bị khóa giờ ngủ", "Đang trong giờ ngủ (${p.bed} → ${p.wake}).")
                else if (gMins >= gLim) BlockDecision(true, "screen", "Nhóm \"${grp.name}\" đã hết giờ!", "Nhóm này đã dùng $gMins/$gLim phút hôm nay.")
                else BlockDecision(false)
            }
            else -> { // "apps" — khóa riêng từng app theo hạn mức riêng của từng app
                if (pkg !in p.blockedPkgs) return BlockDecision(false)
                val appLim = (p.appLimits[pkg]?.takeIf { it > 0 } ?: 30) + p.extra
                if (bed) BlockDecision(true, "bed", "$label bị khóa giờ ngủ", "Đang trong giờ ngủ (${p.bed} → ${p.wake}).")
                else if (pkgMins >= appLim) BlockDecision(true, "screen", "$label đã hết giới hạn riêng!", "Bạn đã dùng $label $pkgMins/$appLim phút hôm nay.")
                else BlockDecision(false)
            }
        }
    }
}
