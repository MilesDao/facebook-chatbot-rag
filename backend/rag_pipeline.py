"""
RAG Pipeline (Supabase)

Responsibilities:
- Retrieve relevant documents based on user query
- Output context text and similarity score (used as confidence)
"""

import os
from dotenv import load_dotenv
from google import genai
from sentence_transformers import SentenceTransformer
from .database import supabase

load_dotenv()

# Initialize Local Embedding Model
# This will download the model (~80MB) on first run
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def get_embedding(text: str) -> list[float]:
    """
    Generate 768-dimension embeddings locally using SentenceTransformer.
    """
    if not client:
        print("Error: Gemini Client is not initialized.")
        return [0.0] * 768
    try:
        # gemini-embedding-001 produces 768-dim vectors
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"Error generating local embedding: {e}")
        return [0.0] * 768

def retrieve_context(user_message: str, match_threshold: float = 0.5, match_count: int = 5):
    """
    Retrieve documents from Supabase vector db.
    Returns:
        context (str): The retrieved text context.
        similarity_score (float): The confidence of retrieval.
    """
    if not supabase:
        print("Supabase client not initialized. Check .env variables.")
        return "", 0.0

    # 1. Embed the user query
    query_embedding = get_embedding(user_message)
    
    # 2. Search Supabase via the match_documents RPC configured in SQL
    try:
        response = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_embedding,
                "match_threshold": match_threshold,
                "match_count": match_count
            }
        ).execute()
    except Exception as e:
        print(f"Error communicating with Supabase RAG RPC: {e}")
        return "", 0.0
    
    data = response.data
    
    if not data:
        return "", 0.0
        
    # Extract the context text blocks and concatenate
    contexts = [str(doc['content']) for doc in data if 'content' in doc]
    context_str = "\n\n".join(contexts)
    
    # The highest similarity score is always at index 0 from our SQL sorting
    best_score = float(data[0].get('similarity', 0.0))
    
    return context_str, best_score
