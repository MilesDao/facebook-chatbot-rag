import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase
def get_supabase_client():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if url and key:
        try:
            return create_client(url, key)
        except Exception as e:
            print(f"Warning: Supabase client could not be initialized: {e}")
            return None
    else:
        print("Warning: SUPABASE_URL or SUPABASE_KEY missing in environment.")
        return None

supabase: Client = get_supabase_client()

