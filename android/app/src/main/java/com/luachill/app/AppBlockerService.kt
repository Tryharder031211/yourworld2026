package com.luachill.app

import android.accessibilityservice.AccessibilityService
import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.accessibility.AccessibilityEvent

/**
 * Dịch vụ hệ thống theo dõi ứng dụng đang mở theo thời gian thực.
 * • Quét cả khi đổi app lẫn định kỳ mỗi 10 giây trong khi người dùng đang mở 1 app.
 * • Tự động dừng khi tắt màn hình / màn hình khóa; không hiện đè lại khi đã về Màn hình chính.
 * • Nhắc hẹn khi gần chạm giới hạn tổng hoặc giới hạn nhóm app.
 * • Khi chạm giới hạn: bật màn hình phủ Draw Over Other Apps với đúng 2 lựa chọn:
 *   1) Quay về app Lừa Chill   2) Tắt tất cả app & Về màn hình chính.
 */
class AppBlockerService : AccessibilityService() {
    private val handler = Handler(Looper.getMainLooper())
    private var currentPkg: String? = null
    private var lastTriggerMs = 0L
    private val warnedKeys = mutableSetOf<String>()

    private val watcher = object : Runnable {
        override fun run() {
            if (isScreenActive()) {
                val active = currentPkg ?: UsageTracker.latestForegroundPkg(this@AppBlockerService)
                if (!active.isNullOrEmpty() && active != packageName) {
                    evaluateForeground(active)
                }
            }
            handler.postDelayed(this, 10_000L)
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        handler.removeCallbacks(watcher)
        handler.postDelayed(watcher, 10_000L)
    }

    private fun isScreenActive(): Boolean {
        val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
        val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        val interactive = pm?.isInteractive ?: true
        val locked = km?.isKeyguardLocked ?: false
        return interactive && !locked
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return

        if (pkg == packageName || pkg == PolicyStore.homePackage(this)) {
            currentPkg = null
            BlockerOverlay.dismiss()
            return
        }
        // Không để thanh thông báo hay bàn phím làm mất dấu ứng dụng đang mở bên dưới
        if (pkg == "com.android.systemui" || pkg in PolicyStore.imePackages(this)) {
            return
        }
        currentPkg = pkg
        evaluateForeground(pkg)
    }

    private fun evaluateForeground(pkg: String) {
        if (!isScreenActive()) return
        val policy = PolicyStore.load(this)
        val usage = UsageTracker.compute(this, policy)
        val day = PolicyStore.dayKey(policy)

        // Cảnh báo sắp chạm giới hạn theo ĐÚNG cơ chế của chế độ đang bật
        if (policy.reminders.enabled && policy.reminders.limitWarn) {
            warnedKeys.removeAll { !it.startsWith("$day|") }
            when (policy.blockMode) {
                "lockdown" -> {
                    val left = (policy.limit + policy.extra) - usage.totalMinutes
                    val globalKey = "$day|global"
                    if (left in 1..policy.reminders.limitLead && warnedKeys.add(globalKey)) {
                        ReminderScheduler.showNotification(
                            this,
                            "Sắp chạm giới hạn hằng ngày ⏳",
                            "Chỉ còn $left phút trước khi bật Khóa toàn bộ!",
                            "timer",
                            9001
                        )
                    }
                }
                "groups" -> {
                    for ((idx, g) in policy.groups.withIndex()) {
                        if (pkg in g.pkgs) {
                            val gUsed = g.pkgs.sumOf { usage.perPkgMinutes[it] ?: 0 }
                            val gLeft = (g.limit + policy.extra) - gUsed
                            val gKey = "$day|grp|${g.id}"
                            if (gLeft in 1..policy.reminders.limitLead && warnedKeys.add(gKey)) {
                                ReminderScheduler.showNotification(
                                    this,
                                    "Nhóm \"${g.name}\" sắp hết giờ ⏳",
                                    "Chỉ còn $gLeft phút cho nhóm ${g.name} hôm nay.",
                                    "timer",
                                    9100 + idx
                                )
                            }
                        }
                    }
                }
                else -> { // "apps"
                    if (pkg in policy.blockedPkgs) {
                        val aLim = (policy.appLimits[pkg]?.takeIf { it > 0 } ?: 30) + policy.extra
                        val aUsed = usage.perPkgMinutes[pkg] ?: 0
                        val aLeft = aLim - aUsed
                        val aKey = "$day|app|$pkg"
                        if (aLeft in 1..policy.reminders.limitLead && warnedKeys.add(aKey)) {
                            val appName = UsageTracker.appLabel(this, pkg)
                            ReminderScheduler.showNotification(
                                this,
                                "$appName sắp hết giờ riêng ⏳",
                                "Chỉ còn $aLeft phút cho $appName hôm nay.",
                                "timer",
                                9200 + (pkg.hashCode() and 0xFF)
                            )
                        }
                    }
                }
            }
        }

        val decision = PolicyStore.checkPackage(this, pkg, policy, usage)
        if (!decision.blocked) return

        val now = System.currentTimeMillis()
        if (BlockerOverlay.isShowing() || now - lastTriggerMs < 1500L) return
        lastTriggerMs = now

        val appName = UsageTracker.appLabel(this, pkg)
        val shown = BlockerOverlay.show(
            ctx = this,
            title = decision.title,
            detail = decision.detail,
            onReturnToApp = {
                currentPkg = null
                performGlobalAction(GLOBAL_ACTION_HOME)
                openLuaChill(appName, decision.reason)
            },
            onCloseAllAndHome = {
                currentPkg = null
                closeBlockedAndGoHome(pkg, policy)
            }
        )

        if (!shown) {
            // Dự phòng nếu người dùng chưa cấp quyền Draw Over Other Apps
            currentPkg = null
            performGlobalAction(GLOBAL_ACTION_HOME)
            openLuaChill(appName, decision.reason)
        }
    }

    private fun openLuaChill(appName: String, reason: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(MainActivity.EXTRA_BLOCKED_APP, appName)
            putExtra(MainActivity.EXTRA_BLOCK_REASON, reason)
        }
        startActivity(intent)
    }

    private fun closeBlockedAndGoHome(currentBlockedPkg: String, policy: BlockPolicy) {
        performGlobalAction(GLOBAL_ACTION_HOME)
        try {
            val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val targets = mutableSetOf(currentBlockedPkg)
            targets.addAll(policy.blockedPkgs)
            policy.groups.forEach { targets.addAll(it.pkgs) }
            targets.removeAll(PolicyStore.systemExemptPackages(this))
            targets.forEach { pkg ->
                try { am.killBackgroundProcesses(pkg) } catch (_: Exception) {}
            }
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        handler.removeCallbacks(watcher)
        BlockerOverlay.dismiss()
        super.onDestroy()
    }

    override fun onInterrupt() {}
}
