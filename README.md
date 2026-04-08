# AI Messenger Bot (RAG + Dashboard)

A professional, end-to-end AI Messenger Bot system featuring a high-performance Backend and a premium Admin Dashboard.

## 🏗️ Project Structure

- **`backend/`**: FastAPI server handling Facebook webhooks, RAG logic, and management APIs.
- **`admin-dashboard/`**: Next.js (TypeScript) management interface with a premium glassmorphic UI.
- **`raw_data/`**: Storage for documents pending ingestion.

---

## 🚀 Deployment

We recommend **Render** for the Backend and **Vercel** for the Frontend.

### 📜 [Detailed Step-by-Step Deployment Guide](deployment_guide.md)

### 1. Backend (Render)
- **Repo**: Connect your GitHub.
- **Root**: Root directory `/`.
- **Command**: Docker will automatically use the `Dockerfile`.
- **Environment Variables**:
  - `SUPABASE_URL`, `SUPABASE_KEY`
  - `PAGE_ACCESS_TOKEN`, `VERIFY_TOKEN` (your hub token)
  - `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`
  - `DASHBOARD_URL`: (Your Vercel URL)

### 2. Dashboard (Vercel)
- **Repo**: Connect your GitHub.
- **Root**: Select `admin-dashboard`.
- **Environment Variables**:
  - `NEXT_PUBLIC_BACKEND_URL`: (Your Render URL)

---

## 🌟 Local Development

1. **Backend**:
   ```bash
   pip install -r requirements.txt
   python -m backend.main
   ```

2. **Dashboard**:
   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```

## 🛠️ Key Features

- **Confidence-Based Handoff**: Automatically flags low-confidence interactions for human review.
- **Knowledge Management**: Upload and index your documents directly from the dashboard.
- **Analytics**: Real-time glassmorphic data visualization of your bot's health.
