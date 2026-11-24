# Lừa Chill — Ứng dụng Android Native (Kotlin)

Dự án Android gốc viết bằng **Kotlin** (`minSdk 26`, `targetSdk 34`) tích hợp toàn bộ hệ thống đo & chặn ứng dụng thật của hệ điều hành Android:

- **`UsageTracker.kt`** (`UsageStatsManager`): đo thời gian sử dụng thật của từng ứng dụng từ đầu ngày game (tự khớp múi giờ / giờ thủ công và tự dừng đếm khi khóa màn hình).
- **`AppBlockerService.kt`** (`AccessibilityService`): phát hiện ứng dụng đang mở theo thời gian thực + quét định kỳ mỗi 10 giây; hỗ trợ đủ 3 chế độ (**Khóa toàn bộ chừa 3 app khẩn cấp**, **Khóa từng app**, **Khóa theo nhóm app**) và **Khóa giờ ngủ 8 tiếng**.
- **`BlockerOverlay.kt`** (`SYSTEM_ALERT_WINDOW` — Draw Over Other Apps): màn hình phủ toàn màn hình chặn nút Back và chỉ cho 2 lựa chọn: **Quay về app Lừa Chill** hoặc **Tắt tất cả app & Về màn hình chính**.
- **`ReminderScheduler.kt`** (`AlarmManager` + `NotificationCompat`): nhắc hẹn chạy nền ngay cả khi tắt app và tự khôi phục sau khi khởi động lại máy hoặc đổi múi giờ.
- **`MainActivity.kt`**: cầu nối `LuaChillNative`, tự cấp quyền vị trí GPS cho đồng hồ, và đăng nhập Google/Discord qua Chrome Custom Tabs (`luachill://auth`).

## Cách build file `.apk`

### Cách 1: Tự động trên GitHub Actions (khuyên dùng — không cần cài gì)
1. Push thư mục gốc của dự án lên GitHub.
2. Vào tab **Actions → Build Android APK**.
3. Tải artifact **`lua-chill-android-apk`** (`app-debug.apk`) về điện thoại Android để cài.

### Cách 2: Mở trực tiếp bằng Android Studio
1. Mở thư mục `android/` trong Android Studio (JDK 17).
2. Bấm **Build → Build APK(s)** (hoặc **Run**). Task `syncWebAssets` trong `app/build.gradle.kts` sẽ **tự động copy** toàn bộ game web vào `app/src/main/assets/www/` trước khi đóng gói.
