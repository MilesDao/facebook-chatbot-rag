# AI Messenger Bot – Execution Plan

## 1. System Overview

The system processes user messages through the following pipeline:

User → Facebook Messenger → Webhook (FastAPI)
     → Message Handler (Core Logic)
     → RAG (Supabase)
     → Redis Memory
     → Gemini LLM
     → Handoff Decision
     → Analytics Logging
     → Response → User

**Objectives:**
- Automatically respond using AI (Gemini + RAG)
- Maintain conversation context (memory)
- Escalate to human when needed
- Log all interactions for analytics

## 2. Architecture Design

The system follows a modular 3-layer architecture:

1. Interface Layer
   - Facebook Messenger
   - Webhook Server (FastAPI)
2. Execution Layer (Core Logic)
   - Message Handler (central controller)
   - RAG Pipeline
   - Gemini Integration
   - Memory (Redis)
   - Handoff Logic
   - Analytics
3. Data Layer
   - Supabase (vector database for RAG)
   - Redis (conversation memory)
   - Database (analytics storage)

## 3. Project Structure
```
project/
│
├── execution/
│   ├── webhook_server.py
│   ├── message_handler.py
│   ├── rag_pipeline.py
│   ├── gemini_integration.py
│   ├── analytics.py
│   └── handoff.py
│
├── directives/
│   └── facebook_messenger_bot.md
│
├── .tmp/
├── requirements.txt
└── .env
```
**Key Principle:**
Keep the webhook lightweight. Move all logic into `message_handler.py`.

## 4. Core Processing Flow

The Message Handler is the central orchestrator of the system.

**Responsibilities:**
- Retrieve relevant context from RAG (Supabase)
- Load conversation history from Redis
- Generate response using Gemini
- Decide whether to trigger human handoff
- Log interaction for analytics
- Update memory

**Important Rule:**
All business logic must live here — not in the webhook.

## 5. Webhook Layer

The webhook server should remain minimal and fast.

**Responsibilities:**
- Receive incoming messages from Messenger
- Extract sender ID and message content
- Call the message handler
- Send response back to Messenger
- Return a quick acknowledgment

**Critical Requirement:**
Always return a response quickly (e.g., `{ "status": "ok" }`). Prevent Messenger retries and duplicate messages.

## 6. RAG Pipeline (Supabase)
**Function:**
- Retrieve relevant documents based on user query

**Output:**
- Context (text for LLM)
- Similarity score (used as confidence)

**Key Insight:**
The similarity score acts as the system’s confidence metric, not the LLM.

## 7. LLM Integration (Gemini)
**Function:**
- Generate responses using:
  - User message
  - Retrieved context
  - Conversation history

**Prompt Design:**
- Include context + history
- Ensure answers are clear, relevant, and grounded

## 8. Memory System (Redis)
**Purpose:**
- Store short-term conversation history

**Design:**
- Key format: `user:{sender_id}:history`
- Store both user and AI messages

**Important Constraint:**
- Set TTL (e.g., 24 hours)

**Why:**
- Prevent unbounded memory growth
- Keep conversations contextually relevant

## 9. Human Handoff Mechanism
**Trigger Condition:**
- Low retrieval confidence (e.g., similarity score < 0.4)

**Behavior:**
- Notify admin or support system
- Mark the interaction as escalated

**Note:**
Do not rely on LLM-generated confidence scores — use retrieval-based metrics.

## 10. Analytics & Logging
Store the following data:
- `sender_id`
- `user_message`
- `ai_reply`
- `confidence_score`
- `handoff_triggered` (boolean)
- `timestamp`

**Purpose:**
- Monitor system performance
- Analyze user behavior
- Improve model and retrieval quality

## 11. Security
**Required:**
- Verify Messenger request signature (`X-Hub-Signature-256`)
- Use `APP_SECRET` to validate authenticity

**Risk if ignored:**
- Unauthorized requests can hit your webhook

## 12. Dependencies

Keep dependencies minimal and relevant:

- FastAPI (web server)
- Uvicorn (ASGI server)
- Requests (HTTP calls)
- Supabase client (vector search)
- Redis client (memory)
- Gemini API client
- LangChain (optional orchestration)
- Sentence Transformers (if needed)

## 13. Testing Strategy
**Functional Testing:**
- Correct RAG responses
- Memory persistence across messages
- Handoff triggered correctly
- Analytics stored properly

**System Testing:**
- Webhook responds quickly (<2s)
- No duplicate messages from retries
- Redis TTL works as expected

## 14. Key Design Principles
- Keep webhook minimal (no business logic)
- Centralize logic in message handler
- Use retrieval score as confidence
- Always implement memory expiration (TTL)
- Log everything for future optimization

🎯 Final Assessment
This system design is production-aligned and scalable.
It effectively combines:
- LLM (Gemini)
- Retrieval (Supabase)
- Memory (Redis)
- Human fallback
- Analytics
