"""
RAG Pipeline (Supabase)

Responsibilities:
- Retrieve relevant documents based on user query
- Output context text and similarity score (used as confidence)
"""

import os
from dotenv import load_dotenv
from openai import OpenAI
from .database import supabase

load_dotenv()

# Initialize Client
def get_llm_client():
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return None
    try:
        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=key
        )
    except:
        return None

client = get_llm_client()


def get_embedding(text: str) -> list[float]:
    """
    Generate 2048-dimension embeddings using OpenRouter API.
    """
    global client
    if not client:
        client = get_llm_client()
        
    if not client:
        print("Error: Client is not initialized (API Key missing).")
        return [0.0] * 2048

    try:
        result = client.embeddings.create(
            model="nvidia/llama-nemotron-embed-vl-1b-v2:free",
            input=[text]
        )
        embedding = result.data[0].embedding
        embedding = embedding[:2048]
        if len(embedding) < 2048:
            embedding += [0.0] * (2048 - len(embedding))
            
        return embedding
        
    except Exception as e:
        print(f"Error generating API embedding: {e}")
        return [0.0] * 2048

def retrieve_context(user_message: str, match_threshold: float = 0.3, match_count: int = 5):
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