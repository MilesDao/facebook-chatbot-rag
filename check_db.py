import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env")
    exit(1)

supabase = create_client(url, key)

def check_db():
    print("--- Checking Bot Settings ---")
    settings_res = supabase.table("bot_settings").select("*").execute()
    for row in settings_res.data:
        print(f"User: {row.get('user_id')} | Page ID: {row.get('page_id')} | LLM: {row.get('llm_model')}")

    print("\n--- Checking Document Counts per User ---")
    docs_res = supabase.table("documents").select("user_id").execute()
    counts = {}
    for row in docs_res.data:
        uid = row.get("user_id")
        counts[uid] = counts.get(uid, 0) + 1
    
    for uid, count in counts.items():
        print(f"User: {uid} | Document Chunks: {count}")

if __name__ == "__main__":
    check_db()
