# Lừa Chill — Ứng dụng Desktop PC (Electron)

Ứng dụng máy tính viết bằng **Electron** cho **Windows (.exe), macOS (.dmg) và Linux (.AppImage)** với đầy đủ chức năng gốc của hệ điều hành:

- **Quét thời gian sử dụng thật (`monitor.js`)**: đọc đúng tiến trình cửa sổ đang mở mỗi 10 giây (tự dừng khi máy nhàn rỗi ≥ 60s), tự lưu dữ liệu theo ngày game (không mất khi khởi động lại PC).
- **Chặn thật đủ 3 chế độ + Khóa giờ ngủ 8 tiếng**:
  1. **Khóa toàn bộ (chừa tối đa 3 app khẩn cấp)**
  2. **Khóa từng app riêng** (có giới hạn phút riêng cho từng ứng dụng PC)
  3. **Khóa theo nhóm app** (tạo nhóm Mạng xã hội, Game, Video...)
- **Màn hình khóa luôn nổi toàn màn hình (`lock-overlay.html`)**: chặn `Esc` / `Alt+F4` và đưa ra đúng 2 lựa chọn: **Quay về app Lừa Chill** hoặc **Tắt ứng dụng này & Về màn hình chính**.
- **Chạy nền ở khay hệ thống (System Tray) & Khởi động cùng máy tính**: đóng cửa sổ sẽ thu nhỏ xuống khay hệ thống để tiếp tục đo thời gian và bắn 5 thông báo nhắc hẹn.
- **Đăng nhập Google & Discord mượt mà**: tự mở trình duyệt mặc định của máy rồi nhận token quay về qua `http://127.0.0.1:45821/auth-callback` (tránh lỗi Google chặn WebView nhúng).

## Lưu ý Supabase Redirect URL cho bản PC
Trong **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**, thêm dòng:
```
http://127.0.0.1:45821/auth-callback
```

## Cách chạy & đóng gói `.exe` / `.dmg`

### Cách 1: Tự động trên GitHub Actions (không cần cài Node.js)
1. Push mã nguồn lên GitHub.
2. Vào tab **Actions → Build Desktop App (Electron)**.
3. Tải file **`LuaChill-Portable-2.2.0.exe`** (chạy ngay không cần cài) hoặc **`LuaChill-Setup-2.2.0.exe`** (bộ cài đặt có icon Desktop).

### Cách 2: Chạy hoặc build trực tiếp trên máy có Node.js 20+
```bash
cd desktop
npm install
npm start            # Chạy thử ngay trên PC
npm run build:win    # Đóng gói Windows Portable .exe + Setup .exe
npm run build:mac    # Đóng gói macOS .dmg
npm run build:linux  # Đóng gói Linux .AppImage
```
