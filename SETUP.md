# 🚀 FaceBook_RAG — Setup Guide (Multi-Tenant SaaS)

> Hướng dẫn cài đặt và chạy project trên local (Arch Linux + Conda).

---

## 📁 Cấu trúc Project

```
FaceBook_RAG/
├── backend/                  # FastAPI — Python
│   ├── main.py               # API endpoints chính
│   ├── auth.py               # JWT verification
│   ├── database.py           # Supabase client
│   ├── rag_pipeline.py       # Vector search
│   ├── message_handler.py    # Luồng xử lý tin nhắn
│   ├── services/
│   │   ├── faq_service.py
│   │   └── ingestion.py
│   ├── migration_v2_multitenant.sql   # ← Chạy trên Supabase 1 lần
│   └── setup_supabase.sql             # ← Schema gốc (nếu DB chưa có)
├── admin-dashboard/          # Next.js 16 — Frontend
│   ├── src/
│   │   ├── middleware.ts     # Route protection
│   │   ├── lib/
│   │   │   ├── supabase.ts   # Supabase clients
│   │   │   └── auth.ts       # Auth helpers + apiFetch
│   │   └── app/
│   │       ├── login/        # Trang đăng nhập
│   │       ├── register/     # Trang đăng ký
│   │       ├── settings/     # Cài đặt bot
│   │       ├── knowledge/    # Upload tài liệu RAG
│   │       ├── faq/          # Quản lý FAQ
│   │       └── handoffs/     # Inbox chuyển tiếp
│   └── .env.local            # Biến môi trường frontend
├── .env                      # Biến môi trường backend
├── requirements.txt
├── SYSTEM_DESIGN_LOGIN.md    # Tài liệu kiến trúc
└── SETUP.md                  # File này
```

---

## ⚙️ PHẦN 1 — Cài đặt Supabase (Làm 1 lần duy nhất)

### 1.1 — Tạo project trên Supabase
1. Vào [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Đặt tên, chọn region gần nhất (Singapore)

### 1.2 — Lấy các credentials cần thiết

Vào **Project Settings → API**, lấy:

| Biến | Lấy ở đâu |
|------|-----------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_KEY` | `service_role` key (scroll xuống dưới anon key) |
| `SUPABASE_JWT_SECRET` | **Settings → API → JWT Settings → JWT Secret** |

### 1.3 — Tắt Email Confirmation (cho môi trường dev)

**Authentication → Email → Tắt "Confirm email"**

### 1.4 — Thêm Redirect URL

**Authentication → URL Configuration → Redirect URLs → Add:**
```
http://localhost:3000
```

### 1.5 — Chạy SQL Migration

Vào **SQL Editor → New query**, paste toàn bộ nội dung file:
```
backend/migration_v2_multitenant.sql
```
Nhấn **Run**.

> ✅ Tạo xong: `profiles`, `bot_settings`, `logs`, `handoffs`, `faqs`, `documents`  
> ✅ Bật RLS trên tất cả các bảng  
> ✅ Tạo trigger tự động khởi tạo data khi user mới đăng ký

### 1.6 — Migrate data cũ của Matthew (nếu đã có data)

Trong **SQL Editor**, chạy:
```sql
-- Tìm UUID của Matthew
SELECT id, email FROM auth.users;
```
Copy UUID của Matthew, thay vào và chạy:
```sql
UPDATE public.logs      SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;
UPDATE public.handoffs  SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;
UPDATE public.faqs      SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;
UPDATE public.documents SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;

-- Tạo bot_settings cho Matthew với token cũ
INSERT INTO public.bot_settings (user_id, page_access_token, verify_token, page_id)
VALUES (
  'MATTHEW_UUID_HERE',
  'YOUR_EXISTING_PAGE_ACCESS_TOKEN',
  'tuyensinh2026',
  'YOUR_FACEBOOK_PAGE_ID'
)
ON CONFLICT (user_id) DO NOTHING;
```

---

## ⚙️ PHẦN 2 — Cấu hình Environment Variables

### 2.1 — Backend: `.env` (thư mục gốc)

```bash
nano ~/FaceBook_RAG/.env
```

Nội dung đầy đủ:
```env
# ── Supabase ─────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJ...                  # anon key (giữ lại để tham khảo)
SUPABASE_SERVICE_KEY=eyJ...          # service_role key ← BẮT BUỘC THÊM MỚI
SUPABASE_JWT_SECRET=your-jwt-secret  # ← BẮT BUỘC THÊM MỚI

# ── AI ───────────────────────────────────────────────
GEMINI_API_KEY=AIzaSy...             # Key mặc định của server (fallback)
GOOGLE_API_KEY=AIzaSy...             # (Nếu dùng)

# ── Facebook (Legacy — giờ lưu trong bot_settings) ───
PAGE_ACCESS_TOKEN=EAAWlX...
VERIFY_TOKEN=tuyensinh2026

# ── Server ───────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
PORT=8000
```

### 2.2 — Frontend: `admin-dashboard/.env.local`

```bash
nano ~/FaceBook_RAG/admin-dashboard/.env.local
```

Nội dung:
```env
# ── Backend API ───────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000

# ── Supabase (public keys — an toàn cho browser) ─────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## ⚙️ PHẦN 3 — Cài đặt Dependencies

### 3.1 — Backend (Conda)

```bash
# Kích hoạt environment fb_rag (đã có sẵn)
conda activate fb_rag

# Cài thêm PyJWT nếu chưa có (thường đã có rồi)
pip install PyJWT
```

### 3.2 — Frontend (npm)

```bash
cd ~/FaceBook_RAG/admin-dashboard
npm install
# Đảm bảo @supabase/ssr đã được cài
npm install @supabase/ssr
```

---

## 🚀 PHẦN 4 — Chạy Project

### Terminal 1 — Backend (FastAPI)

```bash
conda activate fb_rag
cd ~/FaceBook_RAG
uvicorn backend.main:app --reload --port 8000
```

Kiểm tra backend chạy:
```
http://localhost:8000/health
```
Kết quả mong đợi: `{"status":"ok","service":"backend","mode":"multi-tenant"}`

### Terminal 2 — Frontend (Next.js)

```bash
cd ~/FaceBook_RAG/admin-dashboard
npm run dev
```

Dashboard: [http://localhost:3000](http://localhost:3000)

> Sẽ tự động redirect sang `/login`

---

## ✅ PHẦN 5 — Test Sau Khi Cài

### Test 1 — Đăng ký & Đăng nhập
1. Vào `http://localhost:3000` → redirect `/login`
2. Click **Create one** → trang `/register`
3. Đăng ký account mới → đăng nhập
4. Dashboard hiện `0` data → ✅ đúng (empty state)

### Test 2 — Cấu hình Bot
1. Vào **Settings**
2. Nhập `Page ID`, `Verify Token`, `Page Access Token`, `Gemini API Key`
3. Nhấn **Save Settings**

### Test 3 — Kiểm tra Data Isolation
1. Đăng nhập user A → thêm vài FAQ
2. Đăng xuất → đăng nhập user B
3. FAQ của user A KHÔNG hiện ở user B → ✅ isolation đúng

### Test 4 — API có auth
```bash
# Không có token → expect 401
curl http://localhost:8000/api/analytics

# Có token (lấy từ browser DevTools → Application → Cookies → sb-*-auth-token)
curl http://localhost:8000/api/analytics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 PHẦN 6 — Cấu hình Facebook Webhook

Sau khi deploy (hoặc dùng ngrok để test local):

1. Vào **Facebook Developer Portal → App → Messenger → Webhooks**
2. **Callback URL:** `https://your-domain.com/webhook` (FastAPI port 8000)
3. **Verify Token:** giống `verify_token` bạn đặt trong **Settings**
4. Subscribe các events: `messages`, `messaging_postbacks`

---

## 🆚 Ports Summary

| Service | Port | URL |
|---------|------|-----|
| FastAPI Backend | 8000 | `http://localhost:8000` |
| Next.js Frontend | 3000 | `http://localhost:3000` |

> Nếu port bị conflict, thay `--port 8001` cho backend và cập nhật `NEXT_PUBLIC_API_URL=http://localhost:8001`.

---

## 📖 Tài liệu thêm

- [`SYSTEM_DESIGN_LOGIN.md`](./SYSTEM_DESIGN_LOGIN.md) — Giải thích kiến trúc Auth & Data Isolation bằng tiếng Anh đơn giản
- [`backend/migration_v2_multitenant.sql`](./backend/migration_v2_multitenant.sql) — SQL migration chạy trên Supabase
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Kiến trúc tổng quan
