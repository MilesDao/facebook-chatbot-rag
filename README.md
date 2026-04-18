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
- **LLM Interruption (Pause AI)**: Admins can pause AI responses per sender to take over the conversation manually via Business Suite, then resume AI when done.
- **Handoff Inbox Management**:
  - Active and Resolved queues grouped by sender.
  - Batch resolve, restore, and delete operations with multi-select.
  - Facebook name resolution — shows real user names alongside PSIDs.
- **Premium Admin Dashboard**: Cutting-edge **Next.js 16** dashboard with:
  - Theme-aware design (Dark/Light mode/Glassmorphism).
  - Robust authentication & recovery flows (Email + Google OAuth).
  - Real-time knowledge source management & indexing controls.
  - System Overview with per-sender AI pause/resume toggle.
  - Bilingual support (English / Vietnamese).

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: Next.js 16, React 19, TailwindCSS 4, Lucide Icons
- **Database**: Supabase (PostgreSQL + `pgvector`)
- **AI Backend**: OpenAI SDK (routed via OpenRouter.ai)
- **Security**: Supabase JWT (HS256) & RLS Policies

## ⚙️ Setup & Installation

### 1. Supabase Preparation
- Enable the **Vector** extension in your Supabase project.
- Run `backend/setup_supabase.sql` to initialize the full multi-tenant schema (includes `bot_settings`, `documents`, `faqs`, `logs`, `handoffs`, `paused_senders`, and the similarity search function).

> **Note:** If upgrading from an older version, run these migrations in the SQL Editor:
> ```sql
> ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS system_prompt TEXT;
> 
> CREATE TABLE IF NOT EXISTS paused_senders (
>   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
>   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
>   sender_id text NOT NULL,
>   paused_at timestamptz DEFAULT now(),
>   UNIQUE(user_id, sender_id)
> );
> ALTER TABLE paused_senders ENABLE ROW LEVEL SECURITY;
> CREATE POLICY "Users can manage their own paused senders"
>   ON paused_senders FOR ALL
>   USING (auth.uid() = user_id)
>   WITH CHECK (auth.uid() = user_id);
> 
> NOTIFY pgrst, 'reload schema';
> ```

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

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET/PUT` | `/api/settings` | Bot settings (tokens, model, system prompt) |
| `GET` | `/api/handoffs` | List all handoff requests |
| `PUT` | `/api/handoffs/{id}/resolve` | Mark handoff as resolved |
| `PUT` | `/api/handoffs/{id}/restore` | Restore resolved handoff to active |
| `DELETE` | `/api/handoffs/{id}` | Permanently delete a handoff |
| `GET` | `/api/senders/paused` | List paused sender IDs |
| `POST` | `/api/senders/{id}/pause` | Pause AI for a sender |
| `DELETE` | `/api/senders/{id}/pause` | Resume AI for a sender |
| `POST` | `/api/facebook/resolve-names` | Resolve PSIDs to Facebook names |
| `GET` | `/api/analytics` | Conversation logs & stats |
| `GET/POST/DELETE` | `/api/faq` | FAQ management |
| `GET/POST/DELETE` | `/api/sources` | Knowledge source management |

## 📦 Project Structure

```text
/
├── admin-dashboard/        # Next.js 16 frontend
│   └── src/
│       ├── app/(auth)/     # Login, signup, recovery
│       ├── app/(dashboard)/ # Overview, handoffs, settings, sources, FAQ
│       ├── components/     # LanguageContext, shared UI
│       └── lib/            # Auth utilities
├── backend/                # FastAPI backend
│   ├── services/           # Ingestion, FAQs, History
│   ├── main.py             # API & Webhook controller
│   ├── message_handler.py  # RAG pipeline orchestrator
│   ├── openrouter_integration.py # LLM response generation
│   └── setup_supabase.sql  # Full database schema
├── raw_data/               # Staging for document indexing
└── .env                    # Environment config
```

## 🔒 Security & Multi-Tenancy
This project uses **Row Level Security (RLS)** in Supabase. Every document, FAQ, handoff, paused sender, and setting is strictly tied to a `user_id`, ensuring data isolation between different Facebook Page admins.

## 📝 License
Internal project / Proprietary.

