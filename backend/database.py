import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase
def get_supabase_client():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    # Prioritize Service Role Key for backend administrative tasks, fallback to Anon Key variations
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if url and key:
        try:
            return create_client(url, key)
        except Exception as e:
            print(f"Warning: Supabase client could not be initialized: {e}")
            return None
    else:
        print("Warning: Missing Supabase credentials in environment (SUPABASE_URL, SUPABASE_KEY, etc).")
        return None

supabase: Client = get_supabase_client()

