# Facebook Chatbot RAG (Multi-Tenant & OpenRouter)

A powerful, multi-tenant AI chatbot system for Facebook Messenger, powered by OpenRouter LLMs and Retrieval-Augmented Generation (RAG) via Supabase.

## 🚀 Key Features

- **Multi-Tenant Architecture**: Supports multiple Facebook Pages and Users with separate configurations and knowledge bases.
- **OpenRouter Powered**: Integrated with OpenRouter API (OpenAI SDK) for high-performance LLM responses and semantic routing.
- **Semantic Intent Routing**: Automatically classifies user messages into QA, FAQ, Handoff, or Chitchat to optimize response quality.
- **Advanced RAG Pipeline**: Uses high-dimensional (2048-dim) embeddings and vector search via Supabase (pgvector) to provide grounded answers.
- **Automated Human Handoff**: Triggers a handoff to a human agent when the AI confidence score is low or the user requests complex support.
- **Admin Dashboard**: Next.js-based dashboard to manage configuration, knowledge sources, FAQs, and view analytics.

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js (React)
- **Database**: Supabase (PostgreSQL + pgvector)
- **LLM API**: OpenRouter (GPT, Claude, Llama models)
- **Memory**: Redis / Upstash (Optional history tracking)

## 📦 Project Structure

```text
/
├── admin-dashboard/     # Next.js frontend for bot management
├── backend/             # FastAPI backend logic
│   ├── services/        # Business logic: ingestion, faqs, etc.
│   ├── main.py          # API endpoints & webhooks
│   ├── message_handler.py # Bot orchestration logic
│   ├── openrouter_integration.py # LLM interface
│   └── rag_pipeline.py  # Vector search & RAG logic
├── raw_data/            # Source documents (.txt, .pdf) for ingestion
└── requirements.txt     # Python dependencies
```

## ⚙️ Setup & Installation

1. **Environment Variables**:
   Create a `.env` file in the root with:
   ```env
   SUPABASE_URL=...
   SUPABASE_KEY=...
   OPENROUTER_API_KEY=...
   VERIFY_TOKEN=...
   PAGE_ACCESS_TOKEN=...
   ```

2. **Backend**:
   ```bash
   pip install -r requirements.txt
   uvicorn backend.main:app --reload
   ```

3. **Database**:
   Run the SQL scripts in `backend/setup_supabase.sql` in your Supabase SQL Editor to initialize tables and the vector-search RPC.

4. **Frontend**:
   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```

## 📝 License

Internal project / Proprietary.
