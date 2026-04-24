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
    
    # Debug found variables (redacted)
    if url:
        print(f"DEBUG: Found Supabase URL: {url[:10]}...")
    if key:
        print(f"DEBUG: Found Supabase Key: {key[:10]}... (Auth: {'Service Role' if 'service_role' in key.lower() or os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'Anon'})")

    if url and key:
        try:
            return create_client(url, key)
        except Exception as e:
            print(f"Warning: Supabase client could not be initialized: {e}")
            return None
    else:
        print(f"Warning: Missing Supabase credentials. Checked: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY")
        return None

supabase: Client = get_supabase_client()

