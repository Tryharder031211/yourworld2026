package com.luachill.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder

class MainActivity : AppCompatActivity() {
    companion object {
        const val BASE_URL = "https://appassets.androidplatform.net/assets/www/"
        const val EXTRA_BLOCKED_APP = "blocked_app"
        const val EXTRA_BLOCK_REASON = "block_reason"
        const val EXTRA_OPEN_TAB = "open_tab"
    }

    private lateinit var webView: WebView
    private var fileCb: ValueCallback<Array<Uri>>? = null
    private var geoCb: GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null

    private val filePicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val uris = WebChromeClient.FileChooserParams.parseResult(res.resultCode, res.data)
        fileCb?.onReceiveValue(uris)
        fileCb = null
    }

    private val permReq = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { res ->
        val granted = res[Manifest.permission.ACCESS_FINE_LOCATION] == true || res[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        geoCb?.invoke(geoOrigin, granted, false)
        geoCb = null
        geoOrigin = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ReminderScheduler.ensureChannel(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            permReq.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
        }

        webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        CookieManager.getInstance().setAcceptCookie(true)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setGeolocationEnabled(true)
            allowFileAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = false
        }

        webView.addJavascriptInterface(NativeBridge(), "LuaChillNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                if (u.scheme == "tel") {
                    startActivity(Intent(Intent.ACTION_DIAL, u))
                    return true
                }
                if (u.host == "appassets.androidplatform.net") return false
                openExternal(u.toString())
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                wv: WebView,
                cb: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                fileCb?.onReceiveValue(null)
                fileCb = cb
                return try {
                    filePicker.launch(params.createIntent())
                    true
                } catch (_: Exception) {
                    fileCb = null
                    false
                }
            }

            override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback?) {
                val ok = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                if (ok) {
                    callback?.invoke(origin, true, false)
                } else {
                    geoOrigin = origin
                    geoCb = callback
                    permReq.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        handleIntent(intent, initial = true)
    }

    override fun onResume() {
        super.onResume()
        // Cập nhật ngay trạng thái 3 quyền hệ thống khi người dùng quay lại từ Cài đặt Android
        if (::webView.isInitialized) {
            webView.post {
                webView.evaluateJavascript("window.__onAppResume && window.__onAppResume();", null)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent, initial = false)
    }

    private fun handleIntent(intent: Intent?, initial: Boolean) {
        val data = intent?.data
        if (data != null && data.scheme == "luachill" && data.host == "auth") {
            val hash = data.encodedFragment ?: data.encodedQuery ?: ""
            val quoted = JSONObject.quote("#$hash")
            webView.post {
                webView.evaluateJavascript("window.__onAuthCallback && window.__onAuthCallback($quoted);", null)
            }
            if (initial) webView.loadUrl(BASE_URL + "index.html#$hash")
            return
        }

        val blocked = intent?.getStringExtra(EXTRA_BLOCKED_APP)
        val reason = intent?.getStringExtra(EXTRA_BLOCK_REASON) ?: "screen"
        if (!blocked.isNullOrEmpty()) {
            val enc = URLEncoder.encode(blocked, "UTF-8")
            val tab = if (reason == "bed") "sleep" else "tasks"
            webView.loadUrl("${BASE_URL}module-suc-khoe/health.html?blocked=$enc&reason=$reason#$tab")
            return
        }

        val openTab = intent?.getStringExtra(EXTRA_OPEN_TAB)
        if (!openTab.isNullOrEmpty()) {
            webView.loadUrl("${BASE_URL}module-suc-khoe/health.html#$openTab")
            return
        }

        if (initial) webView.loadUrl(BASE_URL + "index.html")
    }

    private fun openExternal(url: String) {
        try {
            CustomTabsIntent.Builder().build().launchUrl(this, Uri.parse(url))
        } catch (_: Exception) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    private fun isAccessibilityEnabled(): Boolean {
        val enabled = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val me = ComponentName(this, AppBlockerService::class.java).flattenToString()
        val shortMe = ComponentName(this, AppBlockerService::class.java).flattenToShortString()
        return enabled.split(':').any { it.equals(me, true) || it.equals(shortMe, true) }
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun setPolicy(json: String) {
            PolicyStore.save(this@MainActivity, json)
        }

        @JavascriptInterface
        fun getUsage(): String = UsageTracker.toJson(this@MainActivity)

        @JavascriptInterface
        fun getInstalledApps(): String {
            val pm = packageManager
            val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val exempt = PolicyStore.systemExemptPackages(this@MainActivity)
            val list = pm.queryIntentActivities(i, PackageManager.MATCH_ALL)
                .map { ri -> ri.activityInfo.packageName to ri.loadLabel(pm).toString() }
                .distinctBy { it.first }
                .filter { (pkg, _) -> pkg !in exempt }
                .sortedBy { it.second.lowercase() }
            val arr = JSONArray()
            for ((pkg, name) in list) {
                arr.put(JSONObject().put("pkg", pkg).put("name", name))
            }
            return arr.toString()
        }

        @JavascriptInterface
        fun getPermissions(): String {
            return JSONObject()
                .put("usage", UsageTracker.hasPermission(this@MainActivity))
                .put("accessibility", isAccessibilityEnabled())
                .put("overlay", Settings.canDrawOverlays(this@MainActivity))
                .put("notify", NotificationManagerCompat.from(this@MainActivity).areNotificationsEnabled())
                .toString()
        }

        @JavascriptInterface
        fun openPermissionSettings(kind: String) {
            runOnUiThread {
                val intent = when (kind) {
                    "usage" -> Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                    "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                    "overlay" -> Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
                    "notify" -> Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                    "battery" -> Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    else -> Intent(Settings.ACTION_SETTINGS)
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                try { startActivity(intent) } catch (_: Exception) {}
            }
        }

        @JavascriptInterface
        fun showNotification(title: String, body: String) {
            ReminderScheduler.showNotification(this@MainActivity, title, body, "timer", (System.currentTimeMillis() % 10000).toInt())
        }

        @JavascriptInterface
        fun openAuth(url: String) {
            runOnUiThread { openExternal(url) }
        }

        @JavascriptInterface
        fun getAppVersion(): String = "2.2.0"
    }
}
