# AI Messenger Bot (RAG + Gemini)

This project provides a fully automated AI Messenger Bot utilizing Facebook Messenger, Supabase (for Retrieval-Augmented Generation context), Redis (for short-term memory), and Google Gemini (for generative text).

## System Architecture

**Pipeline:**
`User → Facebook Messenger → Webhook (FastAPI) → Message Handler (Core Logic) → RAG (Supabase) → Redis Memory → Gemini LLM → Handoff Decision → Analytics Logging → Response → User`

### Design Principles
1.  **Lightweight Webhook:** The FastAPI webhook layer is minimal, forwarding everything immediately.
2.  **Centralized Logic:** `execution/message_handler.py` acts as the orchestrator.
3.  **Confidence-based Handoff:** Similarities from Supabase vector search determine confidence to escalate queries to human admins.

---

## Step-By-Step Setup Guide

Follow these instructions to configure and run the bot locally.

### Step 1: Install Dependencies
Ensure you have Python 3.8+ installed, and run:
```bash
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
You will need credentials from multiple services:
1.  **APP_SECRET:** Head to your Facebook Developers App Dashboard > Settings > Basic.
2.  **SUPABASE_URL & SUPABASE_KEY:** Create a new project on [Supabase.com](https://supabase.com/). Retrieve the API URL and Service Role Key from the Project Settings > API.
3.  **REDIS_URL:** Ensure Redis is running on your machine, or acquire a cloud Redis instance. Default is `redis://localhost:6379`.
4.  **GEMINI_API_KEY:** Generate an API key from Google AI Studio.

Open the `.env` file and fill in your values:
```env
APP_SECRET=your_facebook_app_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key
```

### Step 3: Run the Webhook Server
Start the FastAPI server via Uvicorn. This will be the interface receiving requests from Messenger.

```bash
uvicorn execution.webhook_server:app --reload --host 0.0.0.0 --port 8000
```
*The server will start on `http://localhost:8000`.*

### Step 4: Expose Localhost to the Internet
Facebook Messenger requires an HTTPS endpoint. Use an SSH tunnel like `ngrok` or `localtunnel` to safely expose your port to the web:

```bash
# Using ngrok as an example
ngrok http 8000
```
Copy the Forwarding HTTPS URL provided by ngrok (e.g., `https://abcdef.ngrok.app`).

### Step 5: Configure Messenger Webhook
1.  Navigate back to your App on Facebook Developers.
2.  Under **Messenger > Settings**, find "Webhooks" and click "Edit Callback URL".
3.  Paste your ngrok URL with the webhook endpoint appended: `https://abcdef.ngrok.app/webhook`.
4.  Optionally enter a Verify Token if you plan to implement verification in your backend (highly recommended).
5.  Click **Verify and Save**.

### Step 6: Vector Database (Supabase) Setup (Next Steps)
To make the RAG pipeline functional, you will need to set up the pgvector extension on Supabase, create a table for your knowledge documents, and generate embeddings. This step-by-step logic will reside primarily in your data preparation scripts and `execution/rag_pipeline.py`.

---

## Directory Structure
- `directives/` - Standard operating procedures and system instructions.
- `execution/` - Deterministic python tools defining project functionality.
  - `webhook_server.py`: FastAPI server logic.
  - `message_handler.py`: Central coordination for memory, RAG, and LLM.
  - `rag_pipeline.py`: Handles fetching contexts from Supabase.
  - `gemini_integration.py`: Handles passing queries and contexts to the Gemini LLM.
  - `handoff.py`: Triggers notifications if confidence scores drop too low.
  - `analytics.py`: Logs system performance and query results.
- `.tmp/` - Gitignored temporary storage.
