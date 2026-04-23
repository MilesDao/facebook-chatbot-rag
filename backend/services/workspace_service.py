"""
Workspace Service

CRUD operations for workspaces, members, and industry templates.
"""

from ..database import supabase


def get_user_workspaces(user_id: str) -> list:
    """Get all workspaces a user belongs to (as owner or member)."""
    if not supabase:
        return []
    try:
        # Get workspaces where user is owner
        owned = supabase.table("workspaces").select("*").eq("owner_id", user_id).execute()
        
        # Get workspaces where user is a member
        memberships = supabase.table("workspace_members").select("workspace_id").eq("user_id", user_id).execute()
        member_ws_ids = [m["workspace_id"] for m in (memberships.data or [])]
        
        member_ws = []
        if member_ws_ids:
            member_ws_res = supabase.table("workspaces").select("*").in_("id", member_ws_ids).execute()
            member_ws = member_ws_res.data or []
        
        # Combine and deduplicate
        all_ws = {ws["id"]: ws for ws in (owned.data or []) + member_ws}
        
        # Add role info
        result = []
        for ws in all_ws.values():
            role = "owner" if ws["owner_id"] == user_id else "member"
            # Get specific role if member
            if role == "member":
                for m in memberships.data:
                    if m["workspace_id"] == ws["id"]:
                        role_res = supabase.table("workspace_members").select("role").eq("workspace_id", ws["id"]).eq("user_id", user_id).limit(1).execute()
                        if role_res.data:
                            role = role_res.data[0]["role"]
                        break
            ws["user_role"] = role
            result.append(ws)
        
        return result
    except Exception as e:
        print(f"Error fetching workspaces: {e}")
        return []


def create_workspace(name: str, industry: str, owner_id: str) -> dict:
    """Create a new workspace and initialize it with industry template defaults."""
    if not supabase:
        raise Exception("Database not initialized")
    
    try:
        # 1. Create workspace
        ws_data = {
            "name": name,
            "industry": industry,
            "owner_id": owner_id
        }
        ws_res = supabase.table("workspaces").insert(ws_data).execute()
        workspace = ws_res.data[0]
        ws_id = workspace["id"]
        
        # 2. Add owner as member with 'owner' role
        supabase.table("workspace_members").insert({
            "workspace_id": ws_id,
            "user_id": owner_id,
            "role": "owner"
        }).execute()
        
        # 3. Fetch industry template
        template_res = supabase.table("industry_templates").select("*").eq("industry_code", industry).limit(1).execute()
        template = template_res.data[0] if template_res.data else None
        
        # 4. Create bot_settings with template defaults
        bot_settings = {
            "workspace_id": ws_id,
            "page_access_token": "",
            "google_api_key": "",
            "page_id": "",
            "llm_model": "google/gemini-3.1-flash-lite-preview",
            "system_prompt": template["default_system_prompt"] if template else "",
            "slot_definitions": template["default_slot_definitions"] if template else "[]"
        }
        supabase.table("bot_settings").insert(bot_settings).execute()
        
        workspace["user_role"] = "owner"
        return workspace
        
    except Exception as e:
        print(f"Error creating workspace: {e}")
        raise


def delete_workspace(workspace_id: str, user_id: str) -> bool:
    """Delete a workspace permanently (owner only)."""
    if not supabase:
        return False
    try:
        # Verify ownership
        ws = supabase.table("workspaces").select("owner_id").eq("id", workspace_id).limit(1).execute()
        if not ws.data or ws.data[0]["owner_id"] != user_id:
            return False
            
        supabase.table("workspaces").delete().eq("id", workspace_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting workspace: {e}")
        return False


def get_workspace(workspace_id: str, user_id: str) -> dict:
    """Get a single workspace if user has access."""
    if not supabase:
        return None
    try:
        ws_res = supabase.table("workspaces").select("*").eq("id", workspace_id).limit(1).execute()
        if not ws_res.data:
            return None
        ws = ws_res.data[0]
        
        # Check access
        if ws["owner_id"] == user_id:
            ws["user_role"] = "owner"
            return ws
        
        member_res = supabase.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).limit(1).execute()
        if member_res.data:
            ws["user_role"] = member_res.data[0]["role"]
            return ws
        
        return None
    except Exception as e:
        print(f"Error fetching workspace: {e}")
        return None


def get_workspace_members(workspace_id: str) -> list:
    """Get all members of a workspace."""
    if not supabase:
        return []
    try:
        res = supabase.table("workspace_members").select("*").eq("workspace_id", workspace_id).execute()
        members = res.data or []
        
        # Resolve names using Supabase Auth Admin API
        try:
            auth_users_res = supabase.auth.admin.list_users()
            user_map = {user.id: user for user in auth_users_res}
            for member in members:
                uid = member["user_id"]
                if uid in user_map:
                    user_obj = user_map[uid]
                    meta = user_obj.user_metadata or {}
                    name = meta.get("full_name") or meta.get("name")
                    if not name and user_obj.email:
                        name = user_obj.email.split('@')[0]
                    member["name"] = name or user_obj.email
        except Exception as e:
            print(f"Error resolving user names: {e}")
            
        return members
    except Exception as e:
        print(f"Error fetching workspace members: {e}")
        return []


def add_workspace_member(workspace_id: str, user_email: str, role: str = "viewer") -> dict:
    """Add a member to workspace by email (must be registered user)."""
    if not supabase:
        raise Exception("Database not initialized")
    
    try:
        # Look up user by email in auth.users (via admin API or a custom lookup)
        # For now, we'll need the user_id directly
        # In production, you'd use Supabase Admin API to look up by email
        raise NotImplementedError("Email-based invitation requires Supabase Admin API setup")
    except Exception as e:
        raise


def remove_workspace_member(workspace_id: str, member_user_id: str) -> bool:
    """Remove a member from workspace."""
    if not supabase:
        return False
    try:
        supabase.table("workspace_members").delete().eq("workspace_id", workspace_id).eq("user_id", member_user_id).execute()
        return True
    except Exception as e:
        print(f"Error removing member: {e}")
        return False


def get_industry_templates() -> list:
    """Get all available industry templates."""
    if not supabase:
        return []
    try:
        res = supabase.table("industry_templates").select("*").execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching templates: {e}")
        return []


def get_workspace_id_for_page(page_id: str) -> str:
    """Look up workspace_id from a Facebook page_id (used in webhook processing)."""
    if not supabase:
        return None
    try:
        res = supabase.table("bot_settings").select("workspace_id").eq("page_id", page_id).limit(1).execute()
        if res.data:
            return res.data[0]["workspace_id"]
        return None
    except Exception as e:
        print(f"Error looking up workspace for page {page_id}: {e}")
        return None
