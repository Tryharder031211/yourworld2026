package com.luachill.app

import android.content.Context
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

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
    val blockedPkgs: Set<String> = emptySet()
)

object PolicyStore {
    private const val PREFS = "luachill_prefs"
    private const val KEY = "policy_json"

    val WHITELIST = setOf(
        "com.luachill.app",
        "com.zing.zalo",
        "com.android.dialer",
        "com.google.android.dialer",
        "com.samsung.android.dialer",
        "com.android.incallui",
        "com.android.contacts",
        "com.android.systemui"
    )

    fun save(ctx: Context, rawJson: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY, rawJson).apply()
    }

    fun load(ctx: Context): BlockPolicy {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
            ?: return BlockPolicy()
        return try {
            val j = JSONObject(raw)
            val pkgs = mutableSetOf<String>()
            val arr = j.optJSONArray("blockedPkgs")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val p = arr.optString(i).trim()
                    if (p.isNotEmpty() && p !in WHITELIST) pkgs.add(p)
                }
            }
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
                blockedPkgs = pkgs
            )
        } catch (_: Exception) {
            BlockPolicy()
        }
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

    fun isBedtime(p: BlockPolicy): Boolean {
        val cal = Calendar.getInstance()
        cal.timeInMillis = nowMs(p)
        val h = cal.get(Calendar.HOUR_OF_DAY) + cal.get(Calendar.MINUTE) / 60.0
        val b = hmToH(p.bed)
        val w = hmToH(p.wake)
        return if (b > w) (h >= b || h < w) else (h >= b && h < w)
    }

    /** Trả về "bed", "screen", hoặc null nếu chưa khóa. */
    fun lockReason(ctx: Context, p: BlockPolicy = load(ctx)): String? {
        val day = dayKey(p)
        if (isBedtime(p) && p.brokenNight != day) return "bed"
        if (p.screenLocked && p.day == day) return "screen"
        val usage = UsageTracker.compute(ctx, p)
        val used = maxOf(usage.totalMinutes, if (p.day == day) p.usedFloor else 0)
        if (used >= p.limit + p.extra) return "screen"
        return null
    }
}
