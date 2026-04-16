# Facebook Chatbot with Gemini RAG
## Introduction
This project is a sophisticated Facebook Messenger chatbot designed to provide information and support, leveraging Google's Gemini model. It employs Retrieval-Augmented Generation (RAG) to access and utilize a knowledge base, enabling it to answer user queries effectively. The chatbot is structured to understand user intents, engage in natural conversation, and manage interactions through various backend services.
## Description
The chatbot operates through a Facebook Messenger interface, processing user messages to determine intent and formulate appropriate responses. Key functionalities include:
*   **RAG Integration:** Utilizes a RAG pipeline to retrieve relevant information from a knowledge base (potentially PDF documents) for question answering.
*   **Gemini Model:** Employs Google's Gemini API for natural language understanding, response generation, and intent classification.
*   **Intent Routing:** Differentiates between general chat ('CHITCHAT') and knowledge-based questions ('QA') to tailor responses.
*   **Conversation Management:** Maintains chat history using Redis and manages user sessions, including a feature for human agent takeover.
*   **Document Submission:** Supports users in submitting documents (e.g., application forms) by processing image uploads into PDFs.
*   **Analytics & Handoff:** Logs user interactions for analytics and includes logic for seamless handoff to human support when complex issues arise or the user requests it.
*   **Backend API:** Provides a FastAPI backend for handling webhook events, file uploads, and administrative tasks.
## Guideline
*   **Tone and Persona:** The chatbot is designed to act as a friendly, polite, and professional advisor, specifically adopting the persona of a student advisor for USTH (University of Science and Technology of Hanoi). It communicates in natural, approachable Vietnamese, using appropriate pronouns and particles.
*   **Conciseness:** Responses are kept brief and to the point, avoiding lengthy paragraphs. Summaries are used for lists, often followed by a clarifying question.
*   **Structured Responses:** Responses are broken down into 2 to 4 short, distinct messages, separated by the delimiter `[SPLIT]`, to mimic a natural chat flow.
*   **Data Grounding:** Answers are strictly based on the provided background context. If the information is unavailable, the chatbot will politely state it needs to check.
*   **Human Handoff:** The system can automatically trigger a handoff to a human agent if the LLM determines the query is too complex, sensitive, or requires human judgment, or if the user explicitly requests it.
*   **Document Processing:** For document submissions, the bot confirms receipt, processes the images into a PDF, and provides a confirmation link.
## How to Run
1.  **Prerequisites:**
    *   Python 3.8+
    *   Facebook Developer Account and Page for integration.
    *   Google Cloud Platform account with Gemini API enabled.
    *   Supabase account for vector database and user session management.
    *   Node.js (potentially for frontend dependencies, if any).
2.  **Environment Variables:**
    *   Create a `.env` file in the project root (`D:\Workspace\facebook-chatbot-rag\`).
    *   Populate it with the following variables:
        ```dotenv
        GEMINI_API_KEY=your_gemini_api_key
        SUPABASE_URL=your_supabase_url
        SUPABASE_KEY=your_supabase_key
        PAGE_ACCESS_TOKEN=your_facebook_page_access_token
        VERIFY_TOKEN=your_facebook_verify_token
        FRONTEND_URL=http://localhost:3000 # Or your frontend URL
        ```
3.  **Install Dependencies:**
    *   Navigate to the `backend` directory:
        ```bash
        cd backend
        ```
    *   Install Python dependencies (assuming `requirements.txt` exists):
        ```bash
        pip install -r requirements.txt
        ```
        *Note: Ensure `fastapi`, `uvicorn`, `requests`, `python-dotenv`, `google-generativeai`, `pydantic`, `redis`, and `supabase-py` are listed.*
4.  **Database Setup:**
    *   Configure your Supabase project with the required tables (`user_sessions`) and the `match_documents` RPC function.
5.  **Run the Backend Server:**
    *   From the `backend` directory, run:
        ```bash
        uvicorn main:app --reload
        ```
6.  **Facebook Messenger Integration:**
    *   Configure your Facebook Page webhook to point to your deployed backend's `/webhook` endpoint (e.g., `https://your-domain.com/webhook`).
    *   Ensure `VERIFY_TOKEN` and `PAGE_ACCESS_TOKEN` are correctly set in your environment.
7.  **Data Ingestion:**
    *   Use the `ingest_data.py` script or the `/api/upload` endpoint to add documents to the knowledge base.
## List of Library Requirements
*   `fastapi`
*   `uvicorn`
*   `requests`
*   `python-dotenv`
*   `google-generativeai`
*   `pydantic`
*   `redis`
*   `supabase-py`
*   (Other dependencies as specified in `requirements.txt`)