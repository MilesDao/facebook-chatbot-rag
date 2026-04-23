"""
RAG Pipeline (Supabase)

Responsibilities:
- Retrieve relevant documents based on user query
- Output context text and similarity score (used as confidence)
"""

import os
import threading
from dotenv import load_dotenv
from openai import OpenAI
from .database import supabase

load_dotenv()

def get_embedding(text: str, api_key: str = None) -> list[float]:
    """
    Generate 1536-dimension embeddings via OpenRouter (truncated from 2048).
    Dimensions must match the Supabase table schema (1536).
    """
    openrouter_key = api_key or os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key:
        print("Error: No OpenRouter API key found for embedding generation.")
        return [0.0] * 1536

    try:
        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=openrouter_key)
        result = client.embeddings.create(
            model="nvidia/llama-nemotron-embed-vl-1b-v2:free",
            input=text,
            encoding_format="float",
            extra_body={"input_type": "query"}
        )
        if not result.data:
            return [0.0] * 2048
            
        raw_embed = result.data[0].embedding
        # Regularize to exactly 1536 dimensions (to fit Supabase index limits)
        embedding = list(raw_embed[:1536])
        if len(embedding) < 1536:
            embedding += [0.0] * (1536 - len(embedding))
        return embedding
        
    except Exception as e:
        print(f"Error generating OpenRouter embedding: {e}")
        return [0.0] * 1536

def retrieve_context(user_message: str, match_threshold: float = 0.5, match_count: int = 5, workspace_id: str = None, api_key: str = None):
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
    query_embedding = get_embedding(user_message, api_key=api_key)
    
    # 2. Search Supabase via the match_documents RPC configured in SQL
    try:
        rpc_params = {
            "query_embedding": query_embedding,
            "match_threshold": match_threshold,
            "match_count": match_count
        }
        
        # Use workspace_id for multi-tenant filtering
        if workspace_id:
            rpc_params["p_workspace_id"] = workspace_id
            
        response = supabase.rpc("match_documents", rpc_params).execute()
    except Exception as e:
        print(f"Error communicating with Supabase RAG RPC: {e}")
        return "", 0.0
    
    data = response.data
    print(f"DEBUG: RAG search returned {len(data) if data else 0} results for workspace {workspace_id}")
    
    if not data:
        return "", 0.0
        
    # Extract the context text blocks and concatenate
    contexts = []
    for doc in data:
        content = doc.get('content', '')
        score = doc.get('similarity', 0.0)
        print(f"DEBUG: Found chunk with score {score:.4f}: {content[:50]}...")
        if content:
             contexts.append(str(content))
             
    context_str = "\n\n".join(contexts)
    
    # The highest similarity score is always at index 0 from our SQL sorting
    best_score = float(data[0].get('similarity', 0.0))
    print(f"DEBUG: Final retrieval score: {best_score:.4f}")
    
    return context_str, best_score