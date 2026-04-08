# 🚀 Production Deployment Guide

This guide covers how to deploy your AI Chatbot and Admin Dashboard to the cloud.

---

## 1. Backend Deployment (Render)

Render is a great platform for hosting FastAPI. It will automatically build your `Dockerfile`.

### Steps:
1. Go to [Render.com](https://render.com) and create a **New Web Service**.
2. Connect your GitHub repository.
3. Select the branch (e.g., `server-deploy`).
4. Render will detect your `Dockerfile`. Ensure the **Build Command** is empty and **Start Command** is empty (handled by Docker).
5. **Environment Variables**: Add the following:
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_KEY`: Your Supabase Service Role or Anon key.
   - `VERIFY_TOKEN`: Your chosen token (e.g., `tuyensinh2026`).
   - `PAGE_ACCESS_TOKEN`: The token from your Facebook App.
   - `GROQ_API_KEY`: Your Groq API key.
   - `DASHBOARD_URL`: Your Vercel Dashboard URL (add this *after* deploying the dashboard).
6. Click **Deploy**. Render will give you a public URL like `https://my-bot-backend.onrender.com`.

---

## 2. Admin Dashboard Deployment (Vercel)

Vercel is the best home for Next.js applications.

### Steps:
1. Go to [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. **Root Directory**: Select `admin-dashboard`.
4. **Environment Variables**: Add the following:
   - `NEXT_PUBLIC_BACKEND_URL`: Your **Render** public URL (e.g., `https://my-bot-backend.onrender.com`).
5. Click **Deploy**. Vercel will give you a URL like `https://my-bot-dashboard.vercel.app`.

---

## 3. Facebook Developer Portal Setup

Now that your backend is live, tell Facebook where to send the messages.

### Steps:
1. Go to the [Facebook Developers Console](https://developers.facebook.com).
2. Select your App -> **Messenger** -> **Settings**.
3. Under **Webhooks**, click **Edit Subscription**.
4. **Callback URL**: Paste your Render URL + `/webhook` (e.g., `https://my-bot-backend.onrender.com/webhook`).
5. **Verify Token**: Enter your `VERIFY_TOKEN` (e.g., `tuyensinh2026`).
6. **Subscription Fields**: Check `messages`, `messaging_postbacks`, and `messaging_optins`.
7. Click **Save**.

---

## 4. Final Polish (CORS)

Once your Vercel Dashboard is live:
1. Copy the Vercel URL.
2. Go back to **Render** -> **Environment Variables**.
3. Update `DASHBOARD_URL` with your Vercel URL. 
4. This ensures only your dashboard can access the private analytics data.
