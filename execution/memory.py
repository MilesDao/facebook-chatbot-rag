import os
import json
from typing import List, Dict

# TẠM TẮT REDIS: Chuyển sang in-memory dictionary
# import redis

# Redis connection initialization
# REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
# We use decode_responses=True to get strings directly instead of bytes
# redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Fake in-memory Redis
_in_memory_store = {}

# 24 hours in seconds
TTL_SECONDS = 86400
# Limit memory to last 10 turns
MAX_TURNS = 10

def get_history(user_id: str) -> List[Dict[str, str]]:
    """
    Retrieve conversation history for a specific user.
    """
    key = f"chat:{user_id}"
    return _in_memory_store.get(key, [])
    # history_str = redis_client.get(key)
    # if history_str:
    #     try:
    #         return json.loads(history_str)
    #     except json.JSONDecodeError:
    #         return []
    # return []

def save_history(user_id: str, history: List[Dict[str, str]]):
    """
    Store conversation history back into Redis with a TTL.
    """
    key = f"chat:{user_id}"
    _in_memory_store[key] = history
    # redis_client.setex(key, TTL_SECONDS, json.dumps(history))

def append_message(user_id: str, user_message: str, bot_response: str):
    """
    Append a new interaction to the user's history, limiting size.
    """
    history = get_history(user_id)
    history.append({"user": user_message, "bot": bot_response})
    
    # Keep only the last MAX_TURNS
    if len(history) > MAX_TURNS:
        history = history[-MAX_TURNS:]
        
    save_history(user_id, history)
