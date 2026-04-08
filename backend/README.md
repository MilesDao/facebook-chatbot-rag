# AI Bot Backend (FastAPI)

This is the core webhook and management API for the AI Messenger Bot.

## Structure
- `main.py`: Entry point for FastAPI. Includes Messenger webhooks and Admin API.
- `rag_pipeline.py`: Handles vector search logic.
- `analytics.py`: Manages performance logging to Supabase.
- `handoff.py`: Manages human-in-the-loop escalation.
- `services/ingestion.py`: Core logic for chunking and embedding documents.

## Running Locally
1. Ensure your `.env` is configured in the root directory.
2. Install dependencies: `pip install -r requirements.txt`
3. Start the server:
```bash
python -m backend.main
```
The server will run at `http://localhost:8000`.

## API Endpoints
- `GET /webhook`: Verification for Facebook Messenger.
- `POST /webhook`: Message receiver.
- `POST /api/upload`: Upload files to `raw_data/`.
- `POST /api/index`: Trigger embedding/indexing.
- `GET /api/analytics`: Fetch interaction logs.
- `GET /api/handoffs`: Fetch active handoff requests.
