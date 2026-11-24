# ProGuard rules for Lua Chill
-keepclassmembers class com.luachill.app.MainActivity$NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
