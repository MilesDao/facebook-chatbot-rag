from backend.database import supabase
import sys

def main():
    if not supabase:
        print("no supabase")
        sys.exit(1)
        
    print(dir(supabase.auth))
    if hasattr(supabase.auth, 'admin'):
        print(dir(supabase.auth.admin))
    else:
        print("No admin object")

if __name__ == "__main__":
    main()
