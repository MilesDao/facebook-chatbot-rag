# SYSTEM_DESIGN_LOGIN.md
# Multi-Tenant Auth & Data Isolation Architecture
### FaceBook_RAG Platform

---

## The Big Picture

```
 User's Browser
      │
      ▼
 Next.js Frontend (port 3000)
      │
      ├─── /login, /register ──► Supabase Auth (email + password)
      │
      ├─── Every other route ──► middleware.ts (checks session cookie)
      │         │
      │         ├─ No session? ──► Redirect to /login
      │         └─ Has session? ──► Page renders, carries JWT
      │
      └─── /api/* calls ─────────► FastAPI Backend (port 8000)
                                        │
                                        ├─ Reads Authorization: Bearer <JWT>
                                        ├─ Verifies signature → gets user_id
                                        └─ All queries filtered by user_id
                                                │
                                                ▼
                                        Supabase PostgreSQL
                                        (RLS as safety net)
```

---

## Part 1: Authentication (How Login Works)

### What is Supabase Auth?
Supabase manages user accounts for us — we don't store passwords ourselves. When you click **Sign In**, this happens:

1. Your browser sends `email + password` to Supabase's servers.
2. Supabase checks the credentials and, if valid, returns a **JWT (JSON Web Token)**.
3. This JWT is stored in a **httpOnly cookie** (the browser manages it, JavaScript cannot read it — this is secure).
4. On every subsequent page load, the middleware reads this cookie to know who you are.

### The JWT — What's Inside?
A JWT is a string that looks like `eyJhbGci...`. Decode it and you get:
```json
{
  "sub": "uuid-of-the-user",       ← THE USER ID
  "email": "matthew@example.com",
  "role": "authenticated",
  "exp": 1713000000                 ← expiry timestamp
}
```
The `sub` field is the user's UUID. **This is the key that unlocks their data silo.**

---

## Part 2: The Gatekeeper (middleware.ts)

The middleware file runs **before any page renders**, directly on the Vercel/Node Edge.

```
Browser requests /knowledge
        │
        ▼
middleware.ts runs
        │
        ├─ Reads session cookie
        ├─ Calls Supabase to verify it
        │
        ├─ Session VALID? ──► Allow request, set x-current-path header, continue
        └─ Session MISSING? ──► Immediate redirect to /login
                                (the dashboard page NEVER renders)
```

**Why this is secure:** The redirect happens on the server before a single byte of your dashboard HTML is sent to the browser. An unauthenticated person cannot even see the page structure.

---

## Part 3: Data Isolation (The "Silo" Pattern)

Every table in the database has a `user_id` column. This is how Matthew and Trung never see each other's data.

### Layer 1 — Backend Manual Filtering (Primary)

Our FastAPI backend uses the `get_current_user` dependency on **every** `/api/*` endpoint:

```python
@app.get("/api/faq")
async def get_faqs(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]              # ← Matthew's UUID
    return faq_service.get_all_faqs(user_id)  # ← only returns Matthew's FAQs
```

Inside `faq_service.get_all_faqs()`:
```python
supabase.table("faqs")
    .select("*")
    .eq("user_id", user_id)   # ← SQL: WHERE user_id = 'matthew-uuid'
    .execute()
```

Even if Trung somehow got Matthew's token (he can't, but hypothetically), the query would only return Matthew's rows because the UUID is extracted from the cryptographically signed JWT.

### Layer 2 — Row Level Security (Safety Net)

Supabase's RLS is a database-level firewall. Even if our API code had a bug and forgot to filter, the database itself enforces:

```sql
-- SQL Policy (runs inside PostgreSQL on every query)
CREATE POLICY "Users can manage own faqs"
  ON public.faqs
  USING (auth.uid() = user_id);
```

`auth.uid()` is the UUID extracted from the JWT that Supabase sees. This means **the database physically cannot return another user's rows**, even if the query doesn't have a `WHERE user_id = ?` clause.

### Layer 3 — Backend Service Role (Bypasses RLS intentionally)

The backend uses the `service_role` key which bypasses RLS. This is intentional — the backend is trusted server code that **manually filters every query**. The service_role key is **never exposed to the browser** (it's not in any `NEXT_PUBLIC_*` variable).

---

## Part 4: Webhook Multi-Tenancy

Facebook doesn't send a JWT when it calls your webhook. So we resolve the tenant differently:

```
Facebook sends POST /webhook
  └─ payload contains: entry[0].id = "YOUR_PAGE_ID"

Backend does:
  └─ SELECT * FROM bot_settings WHERE page_id = 'YOUR_PAGE_ID'
  └─ Gets: user_id, page_access_token, gemini_api_key
  └─ Runs the full AI pipeline with that user_id
  └─ Replies using that user's page_access_token
```

Each user registers their Facebook Page ID in their Settings page. This is how two users can each have their own bot connected to their own Facebook page.

---

## Part 5: Automated Onboarding

When a new user registers, a **PostgreSQL trigger** runs automatically:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

`handle_new_user()` creates:
1. A `profiles` row (stores name, email).
2. A `bot_settings` row (empty, ready to be filled).

The new user immediately logs in to a **zero-data dashboard** and goes to Settings to enter their `Page Access Token`, `Gemini API Key`, and `Page ID`.

---

## Part 6: Security Self-Review

| Threat | Mitigation |
|--------|-----------|
| Unauthenticated dashboard access | `middleware.ts` redirects before page renders |
| Stolen session cookie | `httpOnly` cookie — JavaScript cannot read it |
| Cross-tenant data leak via API | `WHERE user_id = ?` on every query (manual + RLS) |
| Forged JWT | Verified using `SUPABASE_JWT_SECRET` (HS256 signature) |
| Service key exposure | Only in backend `.env`, never in `NEXT_PUBLIC_*` |
| Hardcoded PAGE_ACCESS_TOKEN | Moved to `bot_settings` table, per-user |
| Invalid/expired token | `get_current_user` returns HTTP 401 |
| Cross-tenant delete (FAQ, etc.) | Delete queries include `.eq("user_id", user_id)` as double check |

---

## Part 7: What You Need to Do (Checklist)

### Supabase Dashboard
1. Go to **SQL Editor** → New query → Paste `backend/migration_v2_multitenant.sql` → Run.
2. Go to **Settings → API → JWT Settings** → Copy **JWT Secret**.
3. Go to **Settings → API** → Copy **service_role** key (not the anon key — the other one).
4. Go to **Authentication → Email** → Decide if you want email confirmation on/off.
5. Go to **Authentication → URL Configuration** → Add `http://localhost:3000` to **Redirect URLs**.

### Backend `.env`
Add two new variables:
```bash
SUPABASE_SERVICE_KEY=eyJ...   # service_role key from Supabase dashboard
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-settings
```
The existing `SUPABASE_KEY` (anon key) is no longer used by the backend.

### Matthew's Existing Data Migration
1. In Supabase SQL Editor: `SELECT id, email FROM auth.users;`
2. Copy Matthew's UUID.
3. Run the commented UPDATE statements at the bottom of `migration_v2_multitenant.sql`.

### Start the Services
```bash
# Terminal 1 — Backend
conda activate fb_rag
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend
cd admin-dashboard
npm run dev
```

Then go to **http://localhost:3000** — you'll be redirected to `/login`. Register or sign in!

---

## File Change Summary

| File | Change |
|------|--------|
| `backend/migration_v2_multitenant.sql` | NEW — run in Supabase SQL Editor |
| `backend/auth.py` | NEW — JWT verification FastAPI dependency |
| `backend/database.py` | Uses `SUPABASE_SERVICE_KEY` |
| `backend/main.py` | Auth on all /api/* routes, settings CRUD, webhook by page_id |
| `backend/analytics.py` | `user_id` param added |
| `backend/handoff.py` | `user_id` param added |
| `backend/gemini_integration.py` | Per-tenant `api_key` param with .env fallback |
| `backend/rag_pipeline.py` | `user_id` + `api_key` params, RPC passes `p_user_id` |
| `backend/message_handler.py` | Propagates `user_id` + `gemini_api_key` |
| `backend/services/faq_service.py` | All functions filter by `user_id` |
| `backend/services/ingestion.py` | Documents tagged with `user_id`, per-tenant folder |
| `admin-dashboard/src/middleware.ts` | NEW — route protection + pathname header |
| `admin-dashboard/src/lib/supabase.ts` | NEW — browser + server Supabase clients |
| `admin-dashboard/src/lib/auth.ts` | Replaced — real session helpers + `apiFetch` |
| `admin-dashboard/src/app/layout.tsx` | Server Component — conditional sidebar, user email |
| `admin-dashboard/src/app/LogoutButton.tsx` | NEW — client logout button |
| `admin-dashboard/src/app/login/page.tsx` | NEW — glassmorphic login form |
| `admin-dashboard/src/app/register/page.tsx` | NEW — glassmorphic register form |
| `admin-dashboard/src/app/page.tsx` | Uses `apiFetch` |
| `admin-dashboard/src/app/settings/page.tsx` | Full editable form with API save/load |
| `admin-dashboard/src/app/faq/page.tsx` | Uses `apiFetch` |
| `admin-dashboard/src/app/knowledge/page.tsx` | Uses `apiFetch` |
| `admin-dashboard/src/app/handoffs/page.tsx` | Uses `apiFetch` |
| `admin-dashboard/.env.local` | Added `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` |
