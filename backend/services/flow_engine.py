"""
Flow Engine

Responsibilities:
- Execute conversation flows defined in the database
- Track user's current position in a flow
- Handle node transitions based on user input
"""

from ..database import supabase


def get_active_flow_for_message(workspace_id: str, user_message: str) -> dict:
    """
    Find a matching active flow based on trigger keywords.
    Returns the flow dict or None.
    """
    if not supabase:
        return None
    
    try:
        # Fetch all active flows for this workspace
        res = supabase.table("conversation_flows") \
            .select("*") \
            .eq("workspace_id", workspace_id) \
            .eq("is_active", True) \
            .execute()
        
        if not res.data:
            return None
        
        msg_lower = user_message.lower()
        
        # Check keyword triggers
        for flow in res.data:
            keywords = flow.get("trigger_keywords") or []
            for kw in keywords:
                if kw.lower() in msg_lower:
                    return flow
        
        # Return default flow if exists
        for flow in res.data:
            if flow.get("is_default"):
                return flow
        
        return None
        
    except Exception as e:
        print(f"Error finding flow: {e}")
        return None


def get_flow_nodes(flow_id: str) -> list:
    """Get all nodes for a flow and transform to frontend format."""
    if not supabase:
        return []
    try:
        res = supabase.table("flow_nodes").select("*").eq("flow_id", flow_id).execute()
        if not res.data:
            return []
            
        transformed = []
        for node in res.data:
            transformed.append({
                "id": str(node["id"]),
                "type": node["node_type"],
                "position": {"x": node["position_x"], "y": node["position_y"]},
                "data": node["config"]
            })
        return transformed
    except Exception as e:
        print(f"Error fetching flow nodes: {e}")
        return []


def get_flow_edges(flow_id: str) -> list:
    """Get all edges for a flow and transform to frontend format."""
    if not supabase:
        return []
    try:
        res = supabase.table("flow_edges").select("*").eq("flow_id", flow_id).order("sort_order").execute()
        if not res.data:
            return []
            
        transformed = []
        for edge in res.data:
            transformed.append({
                "id": str(edge["id"]),
                "source": str(edge["source_node_id"]),
                "target": str(edge["target_node_id"]),
                "condition": edge["condition"],
                "label": edge["label"] or ""
            })
        return transformed
    except Exception as e:
        print(f"Error fetching flow edges: {e}")
        return []


def get_sender_context(workspace_id: str, sender_id: str) -> dict:
    """Get or create conversation context for a sender."""
    if not supabase:
        return None
    try:
        res = supabase.table("conversation_context") \
            .select("*") \
            .eq("workspace_id", workspace_id) \
            .eq("sender_id", sender_id) \
            .limit(1) \
            .execute()
        
        if res.data:
            return res.data[0]
        
        # Create new context
        new_ctx = {
            "workspace_id": workspace_id,
            "sender_id": sender_id,
            "extracted_slots": {},
            "current_flow_id": None,
            "current_node_id": None
        }
        create_res = supabase.table("conversation_context").insert(new_ctx).execute()
        return create_res.data[0] if create_res.data else new_ctx
        
    except Exception as e:
        print(f"Error getting sender context: {e}")
        return None


def update_sender_context(workspace_id: str, sender_id: str, updates: dict):
    """Update conversation context for a sender."""
    if not supabase:
        return
    try:
        supabase.table("conversation_context") \
            .update(updates) \
            .eq("workspace_id", workspace_id) \
            .eq("sender_id", sender_id) \
            .execute()
    except Exception as e:
        print(f"Error updating sender context: {e}")


def get_next_nodes(flow_id: str, current_node_id: str, user_input: str = None) -> list:
    """
    Get the next nodes from the current node based on edges and optional user input matching.
    """
    edges = get_flow_edges(flow_id)
    
    # Filter edges from current node
    outgoing = [e for e in edges if e["source_node_id"] == current_node_id]
    
    if not outgoing:
        return []
    
    # If user input provided, try to match edge conditions
    if user_input:
        user_lower = user_input.lower().strip()
        for edge in outgoing:
            label = (edge.get("label") or "").lower().strip()
            condition = edge.get("condition") or {}
            
            # Match by label (quick reply text)
            if label and label in user_lower:
                return [edge["target_node_id"]]
            
            # Match by condition
            if condition:
                # Simple string equality check
                if condition.get("operator") == "equals":
                    if user_lower == str(condition.get("value", "")).lower():
                        return [edge["target_node_id"]]
                elif condition.get("operator") == "contains":
                    if str(condition.get("value", "")).lower() in user_lower:
                        return [edge["target_node_id"]]
    
    # Default: return first edge target (fallback)
    if outgoing:
        return [outgoing[0]["target_node_id"]]
    
    return []


def get_start_node(flow_id: str) -> dict:
    """Get the start/entry node of a flow (first node by position)."""
    nodes = get_flow_nodes(flow_id)
    if not nodes:
        return None
    
    # Find node with no incoming edges (start node)
    edges = get_flow_edges(flow_id)
    target_ids = {e["target_node_id"] for e in edges}
    
    for node in nodes:
        if node["id"] not in target_ids:
            return node
    
    # Fallback: return first node by position
    nodes.sort(key=lambda n: (n.get("position_y", 0), n.get("position_x", 0)))
    return nodes[0] if nodes else None


# --- CRUD for Flow Builder API ---

def create_flow(workspace_id: str, name: str, trigger_keywords: list = None, is_default: bool = False) -> dict:
    """Create a new conversation flow."""
    if not supabase:
        raise Exception("Database not initialized")
    try:
        data = {
            "workspace_id": workspace_id,
            "name": name,
            "trigger_keywords": trigger_keywords or [],
            "is_default": is_default,
            "is_active": True
        }
        res = supabase.table("conversation_flows").insert(data).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise Exception(f"Error creating flow: {e}")


def update_flow(flow_id: str, updates: dict) -> dict:
    """Update a flow."""
    if not supabase:
        raise Exception("Database not initialized")
    try:
        res = supabase.table("conversation_flows").update(updates).eq("id", flow_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise Exception(f"Error updating flow: {e}")


def delete_flow(flow_id: str) -> bool:
    """Delete a flow and all its nodes/edges (cascade)."""
    if not supabase:
        return False
    try:
        supabase.table("conversation_flows").delete().eq("id", flow_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting flow: {e}")
        return False


def save_flow_graph(flow_id: str, nodes: list, edges: list):
    """
    Save a complete flow graph (nodes + edges).
    Deletes existing nodes/edges and replaces with new ones.
    """
    if not supabase:
        raise Exception("Database not initialized")
    
    try:
        # Clear existing
        supabase.table("flow_edges").delete().eq("flow_id", flow_id).execute()
        supabase.table("flow_nodes").delete().eq("flow_id", flow_id).execute()
        
        # Insert new nodes
        node_id_map = {}  # temp_id -> real_id
        for node in nodes:
            temp_id = node.get("id")
            
            # Transform frontend format to DB format
            db_node = {
                "flow_id": flow_id,
                "node_type": node.get("type", "message"),
                "label": node.get("data", {}).get("content", ""),
                "position_x": node.get("position", {}).get("x", 0),
                "position_y": node.get("position", {}).get("y", 0),
                "config": node.get("data", {})
            }
            
            res = supabase.table("flow_nodes").insert(db_node).execute()
            if res.data:
                real_id = res.data[0]["id"]
                node_id_map[temp_id] = real_id
        
        # Insert new edges (resolving temp IDs)
        for edge in edges:
            source = edge.get("source", "")
            target = edge.get("target", "")
            
            db_edge = {
                "flow_id": flow_id,
                "source_node_id": node_id_map.get(source, source),
                "target_node_id": node_id_map.get(target, target),
                "condition": edge.get("condition", {}),
                "label": edge.get("label", "")
            }
            supabase.table("flow_edges").insert(db_edge).execute()
        
        return True
    except Exception as e:
        raise Exception(f"Error saving flow graph: {e}")


def process_flow_interaction(workspace_id: str, sender_id: str, user_message: str) -> str:
    """
    Core engine logic:
    1. Check if sender is already in a flow.
    2. If not, check if user_message triggers a new flow.
    3. If in/started a flow, execute the current node and move forward.
    4. Returns AI reply text or None (if no flow/matching node).
    """
    ctx = get_sender_context(workspace_id, sender_id)
    if not ctx:
        return None
    
    current_flow_id = ctx.get("current_flow_id")
    current_node_id = ctx.get("current_node_id")

    flow = None
    if current_flow_id:
        # User is already in a flow, try to continue
        res = supabase.table("conversation_flows").select("*").eq("id", current_flow_id).execute()
        if res.data:
            flow = res.data[0]
    
    if not flow:
        # Check if new flow is triggered
        flow = get_active_flow_for_message(workspace_id, user_message)
        if flow:
            current_flow_id = flow["id"]
            # Get start node
            start_node = get_start_node(current_flow_id)
            current_node_id = start_node["id"] if start_node else None
            update_sender_context(workspace_id, sender_id, {
                "current_flow_id": current_flow_id,
                "current_node_id": current_node_id
            })

    if not flow or not current_node_id:
        return None

    # Execute current node logic
    node_res = supabase.table("flow_nodes").select("*").eq("id", current_node_id).execute()
    if not node_res.data:
        # Node vanished? Reset context
        update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
        return None
    
    node = node_res.data[0]
    node_type = node.get("type")
    node_data = node.get("data") or {}
    
    reply = None
    
    if node_type == "message":
        reply = node_data.get("content")
    elif node_type == "rag":
        # Trigger RAG pipeline (this will be handled by message_handler fallback if we return None)
        # Or we can call it here. For simplicity, let's just return None to let handle_message do it.
        return None
    elif node_type == "handoff":
        from ..handoff import trigger_handoff
        trigger_handoff(sender_id, user_message, 0.0, workspace_id=workspace_id)
        reply = "Đã chuyển kết nối tới nhân viên hỗ trợ. Vui lòng đợi trong giây lát."
    elif node_type == "logic":
        # If it's a logic node, we might need to check keywords to decide where to go
        pass

    # Move to next node
    next_node_ids = get_next_nodes(current_flow_id, current_node_id, user_message)
    if next_node_ids:
        next_node_id = next_node_ids[0]
        update_sender_context(workspace_id, sender_id, {"current_node_id": next_node_id})
        
        # If current node was just a logic check or RAG and didn't have a reply, 
        # we might want to recursively process the next node.
        # But to prevent infinite loops, we'll just stop here and return the reply if we have one.
    else:
        # End of flow
        update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})

    return reply

