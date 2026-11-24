# Hướng dẫn triển khai bản chính thức — Lừa Chill v2.0

Tài liệu này hướng dẫn bật đầy đủ **Đăng nhập Google & Discord**, **Chat online thời gian thực**, **Kết bạn thật**, **Bảng xếp hạng thật**, **Chặn web trên Chrome Extension** và **Chặn app thật trên điện thoại Android**.

---

## 1. Tạo Backend Online miễn phí trên Supabase (5 phút)

1. Tạo tài khoản & dự án miễn phí tại [supabase.com](https://supabase.com).
2. Vào **SQL Editor → New query**, mở file [`backend/supabase.sql`](backend/supabase.sql), dán toàn bộ nội dung rồi bấm **Run**.
   - Script sẽ tự tạo các bảng `profiles`, `saves`, `friendships`, `messages`, `reports`, `blocks`, bảo mật **Row Level Security (RLS)**, chống gian lận Gem/Quest, giới hạn tốc độ chống spam chat, và bật **Realtime** cho bảng `messages`.
3. Vào **Project Settings → API** và sao chép:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key** (`eyJ...`)
4. Điền 2 giá trị đó vào file [`config.js`](config.js):
   ```js
   window.LC_CONFIG = {
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseAnonKey: 'eyJ...',
     providers: ['google', 'discord'],
     siteUrl: 'https://ten-mien-cua-ban.vercel.app', // để trống nếu chạy tự động
     androidRedirect: 'luachill://auth'
   };
   ```

---

## 2. Bật đăng nhập Google & Discord (OAuth)

Trong **Supabase Dashboard → Authentication → URL Configuration**:
- **Site URL**: điền tên miền web chính thức của bạn (ví dụ `https://luachill.vercel.app`).
- **Redirect URLs**: thêm đầy đủ các URL bạn sẽ chạy:
  - `https://ten-mien-cua-ban.vercel.app/**` (Web / PWA / iPad)
  - `http://localhost:8080/**` (nếu test máy cá nhân)
  - `luachill://auth` (App Android)
  - `https://<EXTENSION_ID>.chromiumapp.org/auth` (Chrome Extension — xem ID sau khi load vào `chrome://extensions`)

### Bật Google OAuth
1. Vào [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials → Create Credentials → OAuth client ID (Web application)**.
2. Thêm **Authorized redirect URI**: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
3. Copy **Client ID** và **Client Secret** dán vào **Supabase → Authentication → Providers → Google** rồi bật **Enable**.

### Bật Discord OAuth
1. Vào [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → mục **OAuth2**.
2. Thêm **Redirect**: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
3. Copy **Client ID** và **Client Secret** dán vào **Supabase → Authentication → Providers → Discord** rồi bật **Enable**.

---

## 3. Đưa Web / PWA (Điện thoại, iPad, Laptop) lên mạng

Dự án không cần build step (HTML/CSS/JS thuần):
- **Vercel / Netlify / Cloudflare Pages / GitHub Pages**: chỉ cần push toàn bộ thư mục dự án lên GitHub và kết nối deploy trực tiếp thư mục gốc.
- Người dùng iPad / iPhone có thể mở bằng Safari → **Chia sẻ → Thêm vào màn hình chính (Add to Home Screen)** để dùng như ứng dụng PWA toàn màn hình.

> **Lưu ý về iOS / iPadOS:** Apple không cho phép trình duyệt Web hay PWA chặn các ứng dụng khác trên máy. Trên iPad/iPhone, web/PWA vẫn dùng đầy đủ đăng nhập Google/Discord, chat online, BXH, lịch ngủ 8 tiếng, điểm danh, vườn/pet và khóa trong ứng dụng; để chặn app hệ thống trên iOS cần đóng gói thêm bản native Swift dùng `FamilyControls` của Apple.

---

## 4. Cài Chrome Extension (Chặn web thật trên PC)

1. Mở Chrome → nhập `chrome://extensions`.
2. Bật **Developer mode** (góc trên phải).
3. Bấm **Load unpacked** → chọn thư mục gốc của dự án (`d:\my world`).
4. Vào **Đồng hồ / Sức Khỏe Số → Màn hình** trong app để tích chọn các trang muốn chặn (Facebook, TikTok, Instagram, YouTube, Shopee...) hoặc thêm tên miền tùy chỉnh.
5. Khi hết giới hạn ngày hoặc đến 8 tiếng giờ ngủ, Chrome sẽ tự chặn và chuyển hướng thẳng về màn hình khóa của Lừa Chill.

---

## 5. Build App Android (.APK) chặn ứng dụng thật trên điện thoại

Toàn bộ mã nguồn Kotlin native nằm trong thư mục [`android/`](android/).

### Cách 1: Build tự động miễn phí bằng GitHub Actions (không cần cài Android Studio)
1. Đảm bảo đã điền `config.js`.
2. Push dự án lên một repository GitHub (nhánh `main`).
3. Vào tab **Actions → Build Android APK** → chờ khoảng 2–3 phút → tải file **`lua-chill-android-apk`** (`app-debug.apk`) về điện thoại Android và cài đặt.

### Cách 2: Build trực tiếp bằng Android Studio
1. Copy các file web (`index.html`, `config.js`, `pwa.webmanifest`, `sw.js`, `assets/`, `core/`, `module-suc-khoe/`, `module-tycoon-tamly/`) vào `android/app/src/main/assets/www/`.
2. Mở thư mục `android/` trong Android Studio → **Build → Build APK(s)**.

### Cấp quyền chặn app trên Android
Sau khi cài APK, mở **Đồng hồ / Sức Khỏe Số → Màn hình**:
1. Bấm **Bật ngay** cho **Usage Access** (để đo thời gian dùng app thật).
2. Bấm **Bật ngay** cho **Accessibility Service (Lừa Chill — Chặn ứng dụng)** (để tự đá ra khỏi các app bị khóa).
3. Tick chọn bất kỳ ứng dụng nào đã cài trên điện thoại để chặn khi hết giờ hoặc trong 8 tiếng ngủ.
