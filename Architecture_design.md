# Architecture Design: Gemini-Powered RAG Messenger Bot

## 1. System Overview
This project implements a professional Retrieval-Augmented Generation (RAG) architecture. It is designed to handle automated customer support via Facebook Messenger by grounding AI responses in custom technical documents.

## 2. Technical Stack
* **Language Model:** Gemini 3.1 Flash-Lite-Preview (Optimized for speed and cost).
* **Embedding Model:** gemini-embedding-001 (768-dimensional vectors).
* **Orchestration:** FastAPI (Python) with Google GenAI SDK.
* **Vector Database:** Supabase (PostgreSQL + pgvector).
* **Frontend:** Next.js with Tailwind CSS (Glassmorphic UI).

## 3. Core Workflows

### A. Data Ingestion Pipeline
1.  **Upload:** User uploads `.txt` or `.pdf` via the Admin Dashboard.
2.  **Chunking:** `RecursiveCharacterTextSplitter` breaks text into 1000-character segments.
3.  **Embedding:** Each chunk is sent to OpenRouter API to generate a **2048-dim vector**.
4.  **Storage:** Chunks and vectors are stored in the Supabase `documents` table.

### B. Retrieval & Generation Pipeline (RAG)
1.  **Query:** User sends a message via Messenger.
2.  **Vectorization:** The query is converted into a 2048-dim vector.
3.  **Semantic Search:** Supabase performs a Cosine Similarity search (`<=>`).
4.  **Augmentation:** Relevant context is injected into the System Prompt.
5.  **Generation:** The LLM generates a response based **strictly** on the retrieved context.

### C. Human Handoff Logic
* The system calculates a `confidence_score` based on vector similarity.
* If `score < 0.5`, the backend triggers a handoff event.
* The request appears in the Admin Dashboard "Handoff Inbox" for real-time human intervention.
