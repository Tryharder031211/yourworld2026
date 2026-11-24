package com.luachill.app

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class AppBlockerService : AccessibilityService() {
    private var lastKickMs = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg in PolicyStore.WHITELIST) return

        val policy = PolicyStore.load(this)
        if (pkg !in policy.blockedPkgs) return

        val reason = PolicyStore.lockReason(this, policy) ?: return
        val now = System.currentTimeMillis()
        if (now - lastKickMs < 1200L) return
        lastKickMs = now

        performGlobalAction(GLOBAL_ACTION_HOME)
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(MainActivity.EXTRA_BLOCKED_APP, UsageTracker.appLabel(this@AppBlockerService, pkg))
            putExtra(MainActivity.EXTRA_BLOCK_REASON, reason)
        }
        startActivity(intent)
    }

    override fun onInterrupt() {}
}
