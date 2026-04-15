"""
RAG Pipeline (Supabase)

Responsibilities:
- Retrieve relevant documents based on user query
- Output context text and similarity score (used as confidence)
"""

import os
import threading
from dotenv import load_dotenv
from google import genai
from .database import supabase

load_dotenv()

def get_embedding(text: str, api_key: str = None) -> list[float]:
    """
    Generate 768-dimension embeddings via Gemini API.
    """
    gemini_key = api_key or os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return [0.0] * 768

    try:
        client = genai.Client(api_key=gemini_key)
        # gemini-embedding-001 produces 768-dim vectors
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text
        )
        raw_embed = result.embeddings[0].values
        embedding = list(raw_embed[:768])
        if len(embedding) < 768:
            embedding += [0.0] * (768 - len(embedding))
        return embedding
    except Exception as e:
        print(f"Error generating local embedding: {e}")
        return [0.0] * 768

def retrieve_context(user_message: str, match_threshold: float = 0.5, match_count: int = 5, user_id: str = None, gemini_key: str = None):
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
    query_embedding = get_embedding(user_message, api_key=gemini_key)
    
    # 2. Search Supabase via the match_documents RPC configured in SQL
    try:
        rpc_params = {
            "query_embedding": query_embedding,
            "match_threshold": match_threshold,
            "match_count": match_count
        }
        
        # If user_id is provided, use the multi-tenant RPC
        if user_id:
            rpc_params["p_user_id"] = user_id
            
        response = supabase.rpc("match_documents", rpc_params).execute()
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
