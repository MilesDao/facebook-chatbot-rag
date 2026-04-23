# Facebook Chatbot SaaS Platform - Specification

## 1. Project Overview

**Project Name:** Facebook Chatbot RAG Platform
**Type:** Multi-Tenant SaaS Web Application

A powerful, multi-tenant AI chatbot platform for Facebook Messenger. Organizations can manage multiple bots, knowledge bases, and team members from a single dashboard. Powered by Google Gemini LLMs, Visual Flow Builder, and RAG via Supabase.

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.10+) |
| Frontend | Next.js 16, React 19, TailwindCSS 4 |
| Flow Canvas | @xyflow/react (React Flow) |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | Google AI Studio (Gemini 1.5 Pro/Flash) |
| Storage | Supabase Storage |

---

## 3. Core Features

### 3.1 Multi-Tenant Workspace Management

- **Workspace Isolation**: Each client manages isolated data, configuration, and team members
- **Role-Based Access Control**: Owner, Admin, Viewer roles
- **Industry Templates**: One-click setup for common industries:
  - Admissions (Tuyển sinh)
  - E-commerce (Bán hàng)
  - Customer Service (CSKH)
  - Booking (Đặt lịch)
  - General (Tổng quát)
- **Workspace Gallery**: Trello-inspired entry point for managing bot projects

### 3.2 Visual Flow Builder (n8n-inspired)

- Interactive drag-and-drop canvas using @xyflow/react
- Sidepanel toolbox with draggable nodes
- Visual animated wire connections between nodes
- On-node editing for message content and keywords
- Navigation tools: Mini-map, Zoom/Pan controls
- Node deletion support
- Flow triggers by keywords or default fallback

### 3.3 AI & RAG Pipeline

- **Google AI Studio Integration**: Access to Gemini 1.5 Pro, Flash, etc.
- **Vector Search**: 768-dimension embeddings via models/embedding-001
- **Workspace-scoped filtering**: RAG searches within workspace boundaries
- **Custom AI Personality**: Workspace-specific system prompts
- **Intent Classification**: QA, HANDOFF, CHITCHAT detection
- **Confidence-based Handoff**: Auto-escalate when confidence < 0.3

### 3.4 Facebook Messenger Integration

- Webhook endpoint for receiving messages
- Send text messages with `[SPLIT]` tag for multiple bubbles
- Send attachments (images, videos, audio, files)
- Send typing indicators and mark seen actions
- Multi-page support per workspace

### 3.5 Admin Dashboard

- Glassmorphic UI with blur effects and gradients
- Cross-theme support: Dark, Light, Pink, Green, Blue
- Handoff Inbox: Real-time human intervention requests
- Workspace Switcher: Breadcrumb navigation between workspaces
- Analytics: Conversation logs with confidence scores
- Media Library: Upload and manage media files

---

## 4. Database Schema

### 4.1 Core Tables

| Table | Purpose |
|-------|---------|
| `workspaces` | Multi-tenant workspace records |
| `workspace_members` | User membership and roles |
| `industry_templates` | Pre-built industry configurations |
| `bot_settings` | Facebook page tokens, LLM config, prompts |
| `documents` | RAG knowledge base with vector embeddings |
| `logs` | Conversation analytics |
| `handoffs` | Human takeover requests |
| `paused_senders` | Users paused from AI responses |
| `chat_history` | Message history per sender |
| `conversation_flows` | Flow metadata |
| `flow_nodes` | Individual nodes in flows |
| `flow_edges` | Connections between nodes |
| `conversation_context` | User's current position in flow |

### 4.2 Indexes

- `documents`: HNSW vector index (embedding), workspace_id index
- `bot_settings`: page_id, workspace_id indexes
- `paused_senders`: composite (workspace_id, sender_id)
- `conversation_context`: composite (workspace_id, sender_id)

---

## 5. API Endpoints

### 5.1 Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhook` | Facebook webhook verification |
| POST | `/webhook` | Receive incoming messages |

### 5.2 Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces` | List user's workspaces |
| POST | `/api/workspaces` | Create new workspace |
| GET | `/api/workspaces/{id}` | Get workspace details |
| DELETE | `/api/workspaces/{id}` | Delete workspace (owner only) |
| GET | `/api/workspaces/{id}/members` | List workspace members |
| DELETE | `/api/workspaces/{id}/members/{user_id}` | Remove member |
| GET | `/api/industry-templates` | List available templates |

### 5.3 Flows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flows` | List all flows |
| POST | `/api/flows` | Create new flow |
| GET | `/api/flows/{id}` | Get flow with nodes/edges |
| PUT | `/api/flows/{id}` | Update flow metadata |
| DELETE | `/api/flows/{id}` | Delete flow |
| PUT | `/api/flows/{id}/graph` | Save flow graph (nodes + edges) |

### 5.4 Knowledge Base (RAG)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload documents |
| POST | `/api/index` | Trigger RAG indexing |
| GET | `/api/sources` | List indexed sources |
| DELETE | `/api/sources/{filename}` | Delete source |
| GET | `/api/sources/{filename}/content` | Get source content |

### 5.5 Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get bot settings |
| POST | `/api/settings` | Update bot settings |

### 5.6 Analytics & Handoffs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get conversation logs |
| GET | `/api/handoffs` | List handoff requests |
| PUT | `/api/handoffs/{id}/resolve` | Mark as resolved |
| PUT | `/api/handoffs/{id}/restore` | Restore to active |
| DELETE | `/api/handoffs/{id}` | Delete handoff |
| GET | `/api/handoffs/{id}/chat-link` | Get Business Suite link |

### 5.7 Senders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/senders/paused` | List paused senders |
| POST | `/api/senders/{id}/pause` | Pause AI for sender |
| DELETE | `/api/senders/{id}/pause` | Resume AI for sender |

### 5.8 Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/media/upload` | Upload media file |
| GET | `/api/media` | List media files |
| DELETE | `/api/media/{filename}` | Delete media |

### 5.9 Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/facebook/resolve-names` | Resolve PSIDs to names |
| POST | `/generate` | Legacy LLM generation |

---

## 6. User Flows

### 6.1 Workspace Creation

1. User logs in via Supabase Auth
2. User clicks "Tạo Workspace mới"
3. User selects industry template
4. System creates workspace with default settings, flows, and prompts

### 6.2 Flow Builder Usage

1. User navigates to "Flows" in sidebar
2. User drags nodes from toolbox to canvas
3. User connects nodes by dragging between connection points
4. User edits node content directly on the node
5. User clicks "Save Flow"

### 6.3 Knowledge Base Setup

1. User navigates to "Knowledge Base"
2. User uploads documents (PDF, TXT, etc.)
3. User clicks "Index" to trigger RAG ingestion
4. System generates embeddings and stores in Supabase

### 6.4 Facebook Page Connection

1. User navigates to "Settings"
2. User enters Page Access Token, Page ID, Google API Key
3. System validates credentials
4. Webhook is ready to receive messages

### 6.5 Message Processing Flow

1. Facebook sends message to `/webhook`
2. System identifies workspace by page_id
3. System checks if Flow Engine can handle message
4. If not, system uses RAG + Intent Classification
5. System generates AI response via Google Gemini
6. System sends reply to Facebook Messenger

### 6.6 Human Handoff

1. User triggers handoff (keyword or low confidence)
2. System creates handoff record
3. Admin sees request in Handoff Inbox
4. Admin clicks chat link to open Business Suite
5. Admin resolves handoff when done

---

## 7. Security

- **Authentication**: Supabase JWT (auth.users)
- **Authorization**: Row Level Security (RLS) policies
- **Workspace Isolation**: All queries filtered by workspace_id
- **API Key Protection**: Google AI Studio keys stored per-workspace

---

## 8. File Structure

```
facebook-chatbot-rag/
├── backend/
│   ├── main.py                  # FastAPI app & endpoints
│   ├── auth.py                  # Supabase auth middleware
│   ├── database.py              # Supabase client
│   ├── message_handler.py       # Message orchestration
│   ├── rag_pipeline.py          # Vector search & retrieval
│   ├── intent_router.py         # Intent classification
│   ├── google_ai_integration.py # LLM API calls
│   ├── handoff.py               # Human handoff logic
│   ├── analytics.py             # Logging utilities
│   ├── setup_supabase.sql       # Database schema
│   └── services/
│       ├── workspace_service.py
│       ├── flow_engine.py       # Flow execution
│       ├── ingestion.py         # RAG document ingestion
│       └── history_service.py
├── admin-dashboard/
│   ├── package.json
│   ├── next.config.ts
│   └── src/
│       └── (Next.js app structure)
├── SPEC.md
└── README.md
```

---

## 9. Acceptance Criteria

- [ ] Users can create and manage multiple workspaces
- [ ] Users can invite team members with roles (Owner/Admin/Viewer)
- [ ] Visual Flow Builder allows drag-and-drop node creation
- [ ] Flows trigger based on keywords or as default
- [ ] RAG pipeline retrieves relevant context from uploaded documents
- [ ] AI responses generated via Google Gemini with configurable models
- [ ] Facebook webhook receives and processes messages
- [ ] Handoff system allows human agents to take over conversations
- [ ] Admin dashboard displays analytics and handoff inbox
- [ ] Multi-theme support (Dark/Light/Pink/Green/Blue)
- [ ] Media files can be uploaded and sent via Messenger
- [ ] All data isolated per workspace via RLS policies
