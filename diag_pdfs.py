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

def check_pdfs():
    print("--- Checking user_generated_pdfs ---")
    try:
        res = supabase.table("user_generated_pdfs").select("*").execute()
        if res.data:
            for row in res.data:
                print(f"ID: {row.get('id')} | Workspace: {row.get('workspace_id')} | Sender: {row.get('sender_id')} | URL: {row.get('pdf_url')}")
        else:
            print("No records in user_generated_pdfs")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Checking chat_message_buffer ---")
    try:
        res = supabase.table("chat_message_buffer").select("*").execute()
        if res.data:
            for row in res.data:
                print(f"Sender: {row.get('sender_id')} | Images: {len(row.get('accumulated_images', []))} | Processed: {row.get('processed')}")
        else:
            print("No records in chat_message_buffer")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Checking bot_settings (Page ID mapping) ---")
    try:
        res = supabase.table("bot_settings").select("workspace_id", "page_id").execute()
        for row in res.data:
            print(f"Workspace: {row.get('workspace_id')} | Page ID: {row.get('page_id')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_pdfs()
