import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def cleanup():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return

    supabase = create_client(url, key)

    # 1. Clear user_generated_pdfs table
    print("Clearing 'user_generated_pdfs' table...")
    try:
        # Use a filter that matches all rows
        res = supabase.table("user_generated_pdfs").delete().neq("sender_id", "NOT_EXISTING_ID_123").execute()
        print(f"Deleted rows from user_generated_pdfs.")
    except Exception as e:
        print(f"Error clearing table: {e}")

    # 2. Clear user_documents bucket
    print("Cleaning up 'user_documents' storage bucket...")
    try:
        # List files
        files = supabase.storage.from_("user_documents").list()
        if files:
            file_names = [f['name'] for f in files]
            print(f"Removing {len(file_names)} files from 'user_documents' bucket...")
            supabase.storage.from_("user_documents").remove(file_names)
            print("Files removed.")
        else:
            print("Bucket already empty.")
    except Exception as e:
        print(f"Error clearing bucket: {e}")

    # 3. Drop the table and column if we can via SQL API (optional but thorough)
    # Since we don't have a direct SQL execution tool, we'll stop here.
    # The user can drop them via the dashboard if they want them completely gone.

if __name__ == "__main__":
    cleanup()
