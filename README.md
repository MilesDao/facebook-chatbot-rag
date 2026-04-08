# AI Messenger Bot (RAG + Groq)

A professional, end-to-end AI Messenger Bot system featuring a high-performance Backend and a premium Admin Dashboard.

## 🏗️ Project Structure

- **`backend/`**: FastAPI server handling Facebook webhooks, RAG logic, and management APIs.
- **`admin-dashboard/`**: Next.js (TypeScript) management interface with a premium glassmorphic UI.
- **`raw_data/`**: Storage for documents pending ingestion.

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase account (for Vector DB)
- Groq API Key (for LLM)

### 2. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Configure .env in the root project folder

# Run Backend
python -m backend.main
```
Your backend will be live at `http://localhost:8000`.

### 3. Dashboard Setup
```bash
cd admin-dashboard
npm install
npm run dev
```
Open `http://localhost:3000` to manage your bot.

## 🌟 Key Features

### 1. Confidence-Based Human Handoff
The bot monitors its own confidence via RAG similarity scores. If confidence falls below 60%, the interaction is flagged in the **Handoff Inbox** for human management.

### 2. Knowledge Management
Upload `.txt` or `.pdf` files via the dashboard. Trigger re-indexing with a single click to update the bot's intelligence.

### 3. Real-time Analytics
Monitor interaction volume, user count, average confidence, and handoff rates through a glassmorphic data visualization panel.

## 🛠️ Deployment

- **Backend**: Deploy the `backend/` package to **Render** as a Web Service.
- **Dashboard**: Deploy the `admin-dashboard/` project to **Vercel** or **Render**.
- **Database**: Use **Supabase** for pgvector storage and analytics logging.
