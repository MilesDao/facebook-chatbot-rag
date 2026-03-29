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
Facebook Messenger requires an HTTPS endpoint. We use **Cloudflare Tunnel** (`cloudflared`) to safely expose your local port (8000) to the web.

1. **Install cloudflared:** Download and install the Cloudflare Tunnel daemon for your system from the [official documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. **Start the tunnel:** Run the following command in a new terminal window:
```bash
cloudflared tunnel --url http://localhost:8000
```
3. Copy the **Forwarding HTTPS URL** generated in the console output (it will look something like `https://random-words.trycloudflare.com`).

---

## Deployment on Render (24/7 Hosting)

This project is optimized for deployment on **Render**'s Free Tier using a custom FastAPI wrapper architecture. This allows the bot to run 24/7 by offloading inference directly to the Hugging Face Inference API.

### Architecture Overview
`User → Messenger → Webhook (Render) → Hugging Face → Response`

### Setup Instructions
1.  **Push to GitHub:** Ensure your code is pushed to a GitHub repository.
2.  **Create Render Web Service:** 
    - Log in to [Render](https://render.com).
    - Create a **New +** → **Web Service**.
    - Connect your GitHub repository.
3.  **Configure Environment:**
    - **Runtime:** Docker
    - **Plan:** Free
4.  **Add Environment Variables:**
    - `HUGGINGFACE_API_KEY`: Your Hugging Face token.
    - `HUGGINGFACE_MODEL_ID`: `Qwen/Qwen2.5-1.5B-Instruct` (Recommended).
    - `APP_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `REDIS_URL`, etc.
5.  **Final Step:** Update your Facebook App's Webhook URL to point to your new Render URL: `https://your-app.onrender.com/webhook`.

---

## Redis Memory – Implementation Plan

### 🎯 Goal
Enable the chatbot to retain short-term conversation context so it can respond naturally across multiple turns.

**Example Behavior:**
- User: I want to ask about shipping
- Bot: Shipping takes 3 days
- User: What about returns?
→ The bot understands this is a follow-up question, not a new topic.

### 1. Setup Redis
**Recommended Approach: Local Deployment**
- **Option A – Docker (fastest)**
  Run Redis using Docker: Start a Redis container on port 6379
- **Option B – Native Install**
  macOS/Linux: install via package manager and start Redis server
- **Verification**
  Use Redis CLI to check connection. Expected response: PONG

### 2. Install Redis Client (Python)
Install the Redis Python library to allow your backend to communicate with Redis.

### 3. Connection Layer
Create a dedicated module: `execution/memory.py`

**Responsibilities:**
- Initialize Redis client
- Load connection from environment variables (`REDIS_URL`)
- Provide reusable memory functions

### 4. Memory Data Design
- **Key Concept**: Each user has one conversation session
- **Key Format**: `chat:<user_id>`
- **Value**: Conversation history (either plain text or structured JSON)

### 5. Core Memory Operations
- **5.1 Retrieve History**
  Fetch conversation data using user ID. Return empty if no history exists.
- **5.2 Save History**
  Store updated conversation back into Redis. Apply TTL (expiration time).
- **5.3 Append New Messages**
  Combine previous history with new user message and bot response. Save updated result.

### 6. Integration with LLM (Gemini)
**Flow:**
Retrieve RAG context → Load conversation history from Redis → Build prompt using: history, retrieved context, current user message → Generate response via Gemini → Append new interaction to memory.

**Key Behavior:**
The model should use previous conversation only when relevant. Avoid blindly repeating history.

### 7. Memory Testing
**Manual Testing Steps:**
1. Check initial history (should be empty).
2. Send first message → verify it gets stored.
3. Send follow-up message → verify context is used.

**Expected Outcome:**
Second response reflects previous conversation. Tone becomes more natural and coherent.

### 8. Memory Size Control (Critical)
**Problem:** Unlimited history → Slower responses, higher token cost, possible prompt overflow.
**Solution:** Limit stored memory.
- **Option A – Character-based**: Keep only last ~1000 characters.
- **Option B – Turn-based (recommended)**: Keep last 5–10 conversation turns.

### 9. Structured Memory (Recommended Upgrade)
Instead of plain text, store memory as JSON.
```json
[
  { "user": "...", "bot": "..." },
  { "user": "...", "bot": "..." }
]
```
**Benefits:** Cleaner formatting, easier to manipulate, better control over memory length.
**Prompt Conversion:** Convert JSON into readable conversation format before sending to LLM.

### 10. Expiration Strategy (TTL)
**Standard**: 24 hours (86400 seconds)
**Purpose**: Prevent memory from growing indefinitely, reset stale conversations, reduce infrastructure load.

### 11. Final Memory Flow
Incoming Message → Retrieve Redis History → Retrieve RAG Context → Build Prompt (History + Context + Query) → Generate Response (Gemini) → Store Updated Conversation in Redis → Return Response

### 12. Best Practices
- Always set TTL on keys
- Use consistent key naming (`chat:<user_id>`)
- Limit memory size (turn-based preferred)
- Keep memory module isolated (no business logic inside)
- Avoid storing unnecessary data in conversation history

### 13. Optional Enhancements (Future Upgrades)
- Store user preferences (e.g., language, tone)
- Add conversation summarization for long chats
- Detect user intent from history
- Separate memory types: `chat:<user_id>` → conversation, `profile:<user_id>` → user metadata
- Integrate with memory frameworks (e.g., LangChain memory wrappers)

### 🎯 Final Outcome
After implementation, your chatbot will:
- Maintain conversational continuity
- Handle follow-up questions naturally
- Provide more human-like interactions

This transforms your system from a stateless Q&A bot into a context-aware conversational AI, which is a major step toward production-level quality.

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
