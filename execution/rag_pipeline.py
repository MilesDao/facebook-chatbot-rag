"""
RAG Pipeline (Supabase)

Responsibilities:
- Retrieve relevant documents based on user query
- Output context text and similarity score (used as confidence)
"""

import os
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client

# Initialize Supabase
url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")

if url and key:
    supabase: Client = create_client(url, key)
else:
    supabase = None

# Initialize the embedding model requested: intfloat/multilingual-e5-base
# This model will download and cache locally the first time it is run.
print("Initializing Embedding Model (intfloat/multilingual-e5-base)...")
embedder = SentenceTransformer("intfloat/multilingual-e5-base")

def get_embedding(text: str) -> list[float]:
    """
    Generate 768-dimension embeddings.
    E5 models strictly expect the 'query: ' prefix for robust asymmetric search.
    """
    prefixed_text = f"query: {text}"
    embeddings = embedder.encode(prefixed_text)
    return embeddings.tolist()

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
