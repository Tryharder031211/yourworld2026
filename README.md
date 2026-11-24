# Lừa Chill — Healthy Habits in a Digital World (UN SDG 3)

Ứng dụng game Cozy Life-Sim / Tycoon giúp người trẻ giảm Screen Time, ngủ đủ 8 tiếng đúng giờ, chống tâm lý FOMO và kết nối cộng đồng sống khỏe — hỗ trợ **Web / PWA (Điện thoại, iPad, Desktop)**, **Chrome Extension (chặn web thật)** và **Android App (chặn app thật trên điện thoại)**.

## Tính năng chính (Bản chính thức v2.0)

- **Đăng nhập Google & Discord + Đồng bộ đám mây**: Đăng nhập qua Supabase OAuth, đồng bộ tiến trình giữa nhiều thiết bị.
- **Chat online & Bảng xếp hạng thật (100% người thật)**:
  - Phòng chat cộng đồng thời gian thực (`global`), chat riêng 1-1 (`dm`), sticker doodle, báo cáo & chặn người dùng.
  - Kết bạn qua mã 6 ký tự hoặc tìm theo tên, ghé thăm phòng decor thật của bạn bè.
  - Bảng xếp hạng trực tuyến Toàn cầu & Bạn bè (`Top Gem`, `Ít Dùng Máy`, `Top Quest`, `Ngủ Ngon`).
- **Chặn ứng dụng & màn hình thật do người dùng tự chọn**:
  - **Android (`android/`)**: Đọc danh sách ứng dụng đã cài trên máy, đo thời gian thật bằng `UsageStatsManager` và tự khóa bằng `AccessibilityService`.
  - **Chrome Extension (`manifest.json` + `background.js`)**: Chọn mạng xã hội/web hoặc thêm tên miền tùy chỉnh, tự chặn bằng `declarativeNetRequest`.
  - **Whitelist luôn được phép**: Zalo Công việc & Cuộc gọi khẩn cấp.
- **Giờ ngủ 8 tiếng & Điểm danh trong khung 8 tiếng**:
  - Chọn giờ đi ngủ (tự tính giờ dậy = `+8 tiếng`).
  - Điểm danh trong vòng **8 tiếng** sau khi dậy để nhận Gem (thêm thưởng ngủ đủ 8h, chuỗi ngày và dậy trong 60' đầu).
- **Ưu đãi chăm sóc Vườn hoa & Thú cưng**:
  - Hiệu ứng tưới nước, cây lớn 5 giai đoạn, cho ăn, thú cưng lớn 4 cấp.
  - **Giờ vàng (`+5 Gem`)**, **Chuỗi chăm sóc (`×1.1 → ×1.5 Gem`)**, và **Combo cả ngày (`+40 Gem`)**.
- **Giao diện sạch thoáng, Responsive iPad & Màn hình lớn**: Tự bố cục 2 cột, hộp thoại nổi giữa màn hình và căn giữa sân chơi không cắt hình.
- **Khu Tycoon & Chống FOMO**: Phòng Isometric 2.5D kiểu *Decor Life* sinh Gem theo giờ; Minigame *Shopping Tỉnh Thức* (Shopee + Siêu thị Tap-to-Move & A*) và *Quái Vật Ăn Thịt FOMO*.

## Cấu trúc dự án

```
├─ index.html                     # Cổng chính (Khởi động + OAuth + Sảnh + Chú lừa Voxel)
├─ config.js                      # Cấu hình Supabase URL / Key (xem DEPLOY.md)
├─ pwa.webmanifest & sw.js        # Hỗ trợ cài PWA trên Điện thoại & iPad
├─ manifest.json & background.js  # Chrome Extension MV3 chặn web động theo danh sách người dùng chọn
├─ backend/supabase.sql           # Schema Postgres, RLS bảo mật, chống spam & Realtime
├─ android/                       # Ứng dụng Android Kotlin Native (UsageStats, Accessibility, Draw-Over-Apps, AlarmManager)
├─ desktop/                       # Ứng dụng PC Electron (System Tray, đo & chặn app 3 chế độ, màn hình khóa, OAuth PC)
├─ .github/workflows/             # Tự động build Android .APK và PC Windows .EXE / macOS .DMG / Linux .AppImage
├─ DEPLOY.md                      # Hướng dẫn thiết lập Supabase, Google/Discord OAuth & Build APK
├─ assets/                        # CSS responsive, icon doodle SVG, chú lừa Voxel 3D, tranh nền
├─ core/                          # Engine, UI, Cloud (Supabase), Social online, Lobby, Settings, Boot
├─ module-suc-khoe/               # Mảng 1: health.html, timer.js, tasks.js, sleep-lock.js
└─ module-tycoon-tamly/           # Mảng 2: tycoon.html, room-decor.js, shop.js, fomo.html, game-trend.js, game-monster.js
```

Xem hướng dẫn thiết lập máy chủ online, Google/Discord OAuth và build APK tại **[DEPLOY.md](DEPLOY.md)**.
