# Facebook Chatbot SaaS Platform (Multi-Tenant & Visual Flow Builder)

A powerful, multi-tenant SaaS AI chatbot platform for Facebook Messenger. It allows organizations to manage multiple bots, knowledge bases, and team members from a single dashboard. Powered by OpenRouter LLMs, a professional **n8n-style** Visual Flow Builder, and RAG via Supabase.

---

## 🚀 Key Features

### 🏢 Multi-Tenant SaaS Architecture
- **Workspace Isolation**: Each client manages their own isolated data, configuration, and team members.
- **Role-Based Access**: Owner, Admin, and Viewer roles for team collaboration.
- **Industry Templates**: One-click setup for common industries (Admissions, E-commerce, CSKH, Booking).
- **Workspace Gallery**: A Trello-inspired minimalist entry point to manage all your bot projects.

### 🎨 Pro Visual Flow Builder (n8n-inspired)
- **Interactive Drag-and-Drop**: A professional @xyflow/react canvas for designing conversation trees.
- **Sidepanel Toolbox**: Drag nodes directly onto the canvas like a pro.
- **Interactive Wires**: Visual, animated connections between logic blocks.
- **On-Node Editing**: Edit message content or logic keywords directly on the node without opening sidebars.
- **Navigation Tools**: Built-in Mini-map, Zoom/Pan controls, and on-node deletion.

### 🧠 Advanced AI & RAG
- **OpenRouter Integration**: Access GPT-4o, Claude 3.5, Llama 3, etc.
- **Dynamic RAG Pipeline**: High-performance vector search (1536-dim) with HNSW indexing and workspace filtering.
- **Custom AI Personality**: Workspace-specific system prompts.

### 📊 Modern Admin Dashboard
- **Glassmorphic UI**: Premium translucent elements with blurs and vibrant gradients.
- **Cross-Theme Support**: Perfectly optimized for Dark, Light, and custom themes (Pink, Green, Blue).
- **Handoff Inbox**: Real-time management of human intervention requests.
- **Workspace Switcher**: Seamlessly switch between different bot projects via clickable breadcrumbs.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Flow Canvas**: @xyflow/react (React Flow)
- **Database**: Supabase (PostgreSQL + `pgvector`)
- **Security**: Supabase JWT + RLS Isolation

---

## ⚙️ Setup & Installation

### 1. Supabase Preparation
- Run `backend/setup_supabase.sql` in your Supabase SQL Editor. This will create all tables, indexes, RLS policies, and industry templates.

### 2. Environment Variables
Create a `.env` file in the root:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 4. Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
```

---

## 🇻🇳 Hướng dẫn sử dụng (Vietnamese)

### 1. Tạo Workspace mới
- Sau khi đăng nhập, chọn **"Tạo Workspace mới"** từ trang Gallery.
- Chọn **Template Industry** (ví dụ: Tuyển sinh, Bán hàng) để tự động cài đặt AI Prompt và các nút dữ liệu mẫu.

### 2. Quản lý luồng hội thoại (Flow Builder)
- Vào mục **Flows** trên Sidebar.
- Sử dụng Toolbox bên trái, **kéo thả** các Node vào vùng làm việc.
- Dùng chuột nối các điểm tròn để tạo liên kết logic.
- Sửa nội dung trực tiếp trên Node và nhấn **Save Flow** (sẽ có thông báo xanh hiện lên khi lưu thành công).

### 3. Cài đặt Facebook Page
- Vào mục **Settings**, nhập đầy đủ Page Token và ID để kết nối với Fanpage của bạn.

### 4. Nạp dữ liệu kiến thức (RAG)
- Vào mục **Knowledge Base**, tải lên tài liệu để AI học kiến thức chuyên môn.

---

## 📦 Project Structure
- `/backend`: FastAPI Server & Flow Engine.
- `/admin-dashboard`: Next.js 16 Workspace Dashboard with XYFlow integration.
- `diag_db.py`: Database diagnostic utility.

---
## 📝 License
Internal project / Proprietary.
