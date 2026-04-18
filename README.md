# Facebook Chatbot RAG (Multi-Tenant & OpenRouter)

A powerful, multi-tenant AI chatbot system for Facebook Messenger, powered by OpenRouter LLMs and Retrieval-Augmented Generation (RAG) via Supabase and PostgreSQL.

## 🚀 Key Features

- **Multi-Tenant Architecture**: Independent configurations, knowledge bases, and settings for each admin/page, securely managed in Supabase.
- **Custom AI Personality**: Customize your bot's system prompt and instructions directly from the dashboard.
- **OpenRouter LLM Integration**: Dynamically select from hundreds of models (GPT-4o, DeepSeek, Llama 3) via the dashboard with no vendor lock-in.
- **Dynamic RAG Pipeline**: 
  - **Optimized Embeddings**: Uses high-performance OpenRouter embeddings with 1536-dimension vectors.
  - **HNSW Vector Search**: High-performance approximate nearest neighbor indexing via `pgvector`.
- **Facebook Messenger Integration**: Seamless webhook support with multiple bubble delivery via `[SPLIT]` tags and automated `mark_seen`/`typing_on` indicators.
- **Premium Admin Dashboard**: Cutting-edge **Next.js 16** dashboard with:
  - Theme-aware design (Dark/Light mode/Glassmorphism).
  - Robust authentication & recovery flows.
  - Real-time knowledge source management & indexing controls.

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: Next.js 16, React 19, TailwindCSS 4, Lucide Icons
- **Database**: Supabase (PostgreSQL + `pgvector`)
- **AI Backend**: OpenAI SDK (routed via OpenRouter.ai)
- **Security**: Supabase JWT (HS256) & RLS Policies

## ⚙️ Setup & Installation

### 1. Supabase Preparation
- Enable the **Vector** extension in your Supabase project.
- Run `backend/setup_supabase.sql` to initialize the multi-tenant schema.
- Run the following migration for custom prompts:
  ```sql
  ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS system_prompt TEXT;
  ```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
OPENROUTER_API_KEY=your-openrouter-key
```

### 3. Backend Setup
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
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
├── admin-dashboard/     # Next.js 16 frontend
│   └── src/app/         # Auth, Dashboard, Components
├── backend/             # FastAPI backend
│   ├── services/        # Ingestion, FAQs, History
│   └── main.py          # API & Webhook controller
├── raw_data/            # Staging for document indexing
└── .env                 # Environment config
```

## 🔒 Security & Multi-Tenancy
This project uses **Row Level Security (RLS)** in Supabase. Every document, FAQ, and setting is strictly tied to a `user_id`, ensuring data isolation between different Facebook Page admins.

## 📝 License
Internal project / Proprietary.
