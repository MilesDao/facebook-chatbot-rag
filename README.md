# Facebook Chatbot RAG (Multi-Tenant & OpenRouter)

A powerful, multi-tenant AI chatbot system for Facebook Messenger, powered by OpenRouter LLMs and Retrieval-Augmented Generation (RAG) via Supabase and PostgreSQL.

## 🚀 Key Features

- **Multi-Tenant Architecture**: Independent configurations, knowledge bases, and settings for each admin/page.
- **OpenRouter LLM Integration**: Dynamically select from hundreds of models (GPT-4o, Claude 3.5, Llama 3) via the dashboard.
- **Dynamic RAG Pipeline**: 
  - **Optimized Embeddings**: Uses `nvidia/llama-nemotron-embed-vl-1b-v2:free` (or Google Gecko) with 1536-dimension vectors.
  - **HNSW Vector Search**: High-performance approximate nearest neighbor indexing via `pgvector`.
- **Bulk Knowledge Ingestion**: Upload multiple `.txt`, `.pdf`, or `.docx` files at once to build your chatbot's expertise.
- **Facebook Messenger Integration**: Seamless webhook support with `app_secret` verification and `page_id` management.
- **Premium Admin Dashboard**: Sleek Next.js 14 dashboard with:
  - Real-time settings synchronization.
  - Theme-aware design (Dark/Light mode).
  - Knowledge source management & indexing controls.
  - FAQ and Human Handoff monitoring.

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: Next.js 14, TailwindCSS, Lucide Icons
- **Database**: Supabase (PostgreSQL + `pgvector`)
- **AI Backend**: OpenAI SDK (routed via OpenRouter.ai)
- **Security**: Supabase JWT (HS256) & RLS Policies

## ⚙️ Setup & Installation

### 1. Supabase Preparation
- Enable the **Vector** extension in your Supabase project.
- Run the provided `backend/setup_supabase.sql` in your SQL Editor to initialize the schema, RLS policies, and HNSW indexes.

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
# Supabase Configuration
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (Required for backend RLS bypass)
SUPABASE_JWT_SECRET=your-jwt-secret (Required for API Authentication)

# AI Configuration
OPENROUTER_API_KEY=your-openrouter-key

# Facebook Messenger (Initial defaults)
VERIFY_TOKEN=your-messenger-verify-token
PAGE_ACCESS_TOKEN=your-page-access-token
APP_SECRET=your-facebook-app-secret
```

### 3. Backend Setup
```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m backend.main
```

### 4. Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
```

## 📦 Project Structure

```text
/
├── admin-dashboard/     # Next.js frontend (App Router)
│   └── src/app/(dashboard)/ # Dashboard views & UI
├── backend/             # FastAPI backend
│   ├── services/         # Ingestion, FAQs, Analytics
│   ├── auth.py           # Supabase JWT verification
│   └── main.py           # API controller & Webhooks
├── raw_data/            # Staging area for uploaded documents
└── .env                  # Environment configuration
```

## 🔒 Security Note
This project uses **Row Level Security (RLS)** in Supabase. The backend requires the `SUPABASE_SERVICE_ROLE_KEY` to perform administrative tasks (like indexing documents for specific users), while the frontend uses JWTs for secure user access.

## 📝 License
Internal project / Proprietary.
