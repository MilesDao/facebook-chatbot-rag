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

ids_to_delete = [
    "cc5a2899-5e75-4cb1-8160-fdf2f0d11431",
    "a9c00f4f-ebe1-4eb6-9025-e6c992c9d7c8"
]

def cleanup_workspaces():
    print(f"--- Cleaning up {len(ids_to_delete)} duplicate workspaces ---")
    for ws_id in ids_to_delete:
        try:
            # RLS might prevent deletion if using anon key, but we use service role here
            res = supabase.table("workspaces").delete().eq("id", ws_id).execute()
            print(f"Deleted workspace {ws_id}")
        except Exception as e:
            print(f"Error deleting {ws_id}: {e}")

if __name__ == "__main__":
    cleanup_workspaces()
