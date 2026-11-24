package com.luachill.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import java.util.Calendar

/**
 * Lên lịch thông báo nhắc hẹn hệ thống Android (chạy ngay cả khi đóng app):
 * Nhiệm vụ • Điểm danh 8h • Sắp tới giờ ngủ • Đúng giờ ngủ • Giờ dậy.
 */
object ReminderScheduler {
    const val CHANNEL_ID = "luachill_reminders"
    const val EXTRA_TITLE = "rem_title"
    const val EXTRA_BODY = "rem_body"
    const val EXTRA_TAB = "rem_tab"
    const val EXTRA_ID = "rem_id"

    private const val REQ_QUEST1 = 101
    private const val REQ_QUEST2 = 102
    private const val REQ_WAKE = 103
    private const val REQ_CHECKIN = 104
    private const val REQ_BED_LEAD = 105
    private const val REQ_BED_NOW = 106

    fun ensureChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val ch = NotificationChannel(CHANNEL_ID, "Nhắc hẹn Lừa Chill", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Nhắc nhiệm vụ, điểm danh, giờ đi ngủ, giờ dậy và giới hạn màn hình"
            }
            nm.createNotificationChannel(ch)
        }
    }

    fun showNotification(ctx: Context, title: String, body: String, tab: String = "timer", id: Int = 200) {
        ensureChannel(ctx)
        val open = Intent(ctx, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(MainActivity.EXTRA_OPEN_TAB, tab)
        }
        val pi = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_luachill)
            .setColor(0xFF0A3323.toInt())
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        try { nm.notify(id, n) } catch (_: Exception) {}
    }

    fun scheduleAll(ctx: Context) {
        val p = PolicyStore.load(ctx)
        val r = p.reminders
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        fun cancel(req: Int) {
            val i = Intent(ctx, ReminderReceiver::class.java)
            val pi = PendingIntent.getBroadcast(ctx, req, i, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
            if (pi != null) am.cancel(pi)
        }

        listOf(REQ_QUEST1, REQ_QUEST2, REQ_WAKE, REQ_CHECKIN, REQ_BED_LEAD, REQ_BED_NOW).forEach(::cancel)
        if (!r.enabled) return

        fun scheduleHM(req: Int, hm: String, shiftMin: Int, title: String, body: String, tab: String) {
            val parts = hm.split(":")
            val h = parts.getOrNull(0)?.toIntOrNull() ?: return
            val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
            val cal = Calendar.getInstance().apply {
                timeInMillis = PolicyStore.nowMs(p)
                set(Calendar.HOUR_OF_DAY, h)
                set(Calendar.MINUTE, m)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                add(Calendar.MINUTE, shiftMin)
            }
            var triggerWall = cal.timeInMillis - p.offset
            while (triggerWall <= System.currentTimeMillis() + 30_000L) triggerWall += 86_400_000L

            val intent = Intent(ctx, ReminderReceiver::class.java).apply {
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_TAB, tab)
                putExtra(EXTRA_ID, req)
            }
            val pi = PendingIntent.getBroadcast(ctx, req, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            try {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerWall, pi)
            } catch (_: Exception) {}
        }

        if (r.quests) {
            scheduleHM(REQ_QUEST1, r.questTime, 0, "Nhắc nhiệm vụ đời thực ✅", "Uống nước, vận động, chạm cỏ để nhận Gem trên Lừa Chill nhé!", "tasks")
            if (r.questTime2.isNotBlank()) {
                scheduleHM(REQ_QUEST2, r.questTime2, 0, "Nhắc nhiệm vụ buổi chiều 🌿", "Hoàn thành nốt các Quest đời thực hôm nay nhé!", "tasks")
            }
        }
        if (r.wake) {
            scheduleHM(REQ_WAKE, p.wake, 0, "Chào buổi sáng! ☀️", "Đã ${p.wake} — dậy uống nước và chào ngày mới nào!", "sleep")
        }
        if (r.checkin) {
            scheduleHM(REQ_CHECKIN, p.wake, 15, "Nhớ điểm danh nhận Gem 📅", "Cửa sổ điểm danh 8 tiếng đã mở — vào trong 60 phút đầu nhận thêm +15 Gem!", "sleep")
        }
        if (r.bed) {
            scheduleHM(REQ_BED_LEAD, p.bed, -r.bedLead, "Sắp đến giờ ngủ 🌙", "Còn ${r.bedLead} phút nữa tới ${p.bed}. Chuẩn bị cất máy ngủ đủ 8 tiếng nhé!", "sleep")
            scheduleHM(REQ_BED_NOW, p.bed, 0, "Đến giờ đi ngủ rồi 🌙", "Đã ${p.bed}! Khóa giờ ngủ 8 tiếng đã kích hoạt đến ${p.wake}.", "sleep")
        }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == Intent.ACTION_TIME_CHANGED ||
            action == Intent.ACTION_TIMEZONE_CHANGED
        ) {
            ReminderScheduler.scheduleAll(context)
            return
        }
        val title = intent.getStringExtra(ReminderScheduler.EXTRA_TITLE) ?: "Lừa Chill 🔔"
        val body = intent.getStringExtra(ReminderScheduler.EXTRA_BODY) ?: "Kiểm tra thói quen lành mạnh hôm nay!"
        val tab = intent.getStringExtra(ReminderScheduler.EXTRA_TAB) ?: "timer"
        val id = intent.getIntExtra(ReminderScheduler.EXTRA_ID, 300)
        ReminderScheduler.showNotification(context, title, body, tab, id)
        // Lên lịch tiếp cho ngày hôm sau
        ReminderScheduler.scheduleAll(context)
    }
}
