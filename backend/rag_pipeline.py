"""
RAG Pipeline (Supabase)

Responsibilities:
- Retrieve relevant documents based on user query
- Output context text and similarity score (used as confidence)
"""

import os
from dotenv import load_dotenv
from google import genai
from .database import supabase

load_dotenv()

# LƯU Ý CHO FEN: Đây là API gọi lên Cloud của Google, không tải model về máy.
# NOTE: This initializes the Cloud API client, it does NOT download any local model.
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def get_embedding(text: str) -> list[float]:
    """
    Generate 768-dimension embeddings using Gemini API.
    """
    if not client:
        print("Error: Gemini Client is not initialized.")
        # Sửa thành 768 / Fixed typo 786 -> 768
        return [0.0] * 768 
        
    try:
        # gemini-embedding-001 produces exactly 768-dim vectors
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text
        )
        embedding = result.embeddings[0].values
        
        # Đảm bảo an toàn tuyệt đối độ dài vector là 768 / Strictly enforce 768 dimensions
        if len(embedding) > 768:
            embedding = embedding[:768]
        elif len(embedding) < 768:
            embedding += [0.0] * (768 - len(embedding))
            
        return embedding
        
    except Exception as e:
        print(f"Error generating API embedding: {e}")
        # Sửa thành 768 / Fixed typo 786 -> 768
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