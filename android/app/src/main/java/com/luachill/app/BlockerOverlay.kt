package com.luachill.app

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Màn hình phủ toàn màn hình (Draw Over Other Apps — SYSTEM_ALERT_WINDOW).
 * Khi chạm giới hạn, chặn cứng ứng dụng đang dùng và CHỈ đưa ra đúng 2 lựa chọn:
 *  1) Quay về app Lừa Chill
 *  2) Tắt tất cả app & Về màn hình chính
 */
object BlockerOverlay {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var wm: WindowManager? = null
    private var overlayView: View? = null

    fun isShowing(): Boolean = overlayView != null

    fun show(
        ctx: Context,
        title: String,
        detail: String,
        onReturnToApp: () -> Unit,
        onCloseAllAndHome: () -> Unit
    ): Boolean {
        if (!Settings.canDrawOverlays(ctx)) return false
        mainHandler.post {
            dismissNow()
            val windowManager = ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            wm = windowManager

            val dp = ctx.resources.displayMetrics.density
            fun d(v: Int) = (v * dp).toInt()

            val root = object : LinearLayout(ctx) {
                override fun dispatchKeyEvent(event: KeyEvent?): Boolean {
                    // Không cho bấm nút Back để thoát màn hình khóa
                    if (event?.keyCode == KeyEvent.KEYCODE_BACK) return true
                    return super.dispatchKeyEvent(event)
                }
            }.apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setBackgroundColor(Color.parseColor("#F50A3323"))
                setPadding(d(26), d(40), d(26), d(40))
                isFocusable = true
                isFocusableInTouchMode = true
            }

            val card = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                setPadding(d(22), d(26), d(22), d(22))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#F7F4D5"))
                    cornerRadius = d(22).toFloat()
                    setStroke(d(3), Color.parseColor("#0A3323"))
                }
            }

            val badge = TextView(ctx).apply {
                text = "LỪA CHILL • ĐÃ CHẠM GIỚI HẠN"
                textSize = 12f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#F7F4D5"))
                setPadding(d(12), d(5), d(12), d(5))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#105666"))
                    cornerRadius = d(12).toFloat()
                }
            }

            val tvTitle = TextView(ctx).apply {
                text = title
                textSize = 22f
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setTextColor(Color.parseColor("#0A3323"))
                setPadding(0, d(16), 0, d(8))
            }

            val tvDetail = TextView(ctx).apply {
                text = detail
                textSize = 15f
                gravity = Gravity.CENTER
                setTextColor(Color.parseColor("#105666"))
                setPadding(0, 0, 0, d(20))
            }

            fun makeBtn(label: String, bgHex: String, textHex: String, onClick: () -> Unit): Button {
                return Button(ctx).apply {
                    text = label
                    isAllCaps = false
                    textSize = 16f
                    typeface = Typeface.DEFAULT_BOLD
                    setTextColor(Color.parseColor(textHex))
                    setPadding(d(16), d(14), d(16), d(14))
                    background = GradientDrawable().apply {
                        setColor(Color.parseColor(bgHex))
                        cornerRadius = d(14).toFloat()
                        setStroke(d(2), Color.parseColor("#0A3323"))
                    }
                    setOnClickListener {
                        dismissNow()
                        onClick()
                    }
                }
            }

            val btnReturn = makeBtn("Quay về app Lừa Chill", "#839958", "#0A3323", onReturnToApp)
            val btnHome = makeBtn("Tắt tất cả app & Về màn hình chính", "#D3968C", "#0A3323", onCloseAllAndHome)

            val tvFoot = TextView(ctx).apply {
                text = "Hãy chọn 1 trong 2 cách trên để cho mắt nghỉ ngơi nhé."
                textSize = 12.5f
                gravity = Gravity.CENTER
                setTextColor(Color.parseColor("#105666"))
                setPadding(0, d(14), 0, 0)
            }

            card.addView(badge)
            card.addView(tvTitle)
            card.addView(tvDetail)
            card.addView(btnReturn, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = d(12)
            })
            card.addView(btnHome, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
            card.addView(tvFoot)

            root.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

            val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }
            val lp = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.CENTER
            }

            try {
                windowManager.addView(root, lp)
                overlayView = root
                root.requestFocus()
            } catch (_: Exception) {
                overlayView = null
            }
        }
        return true
    }

    fun dismiss() {
        mainHandler.post { dismissNow() }
    }

    private fun dismissNow() {
        val v = overlayView ?: return
        overlayView = null
        try { wm?.removeView(v) } catch (_: Exception) {}
    }
}
