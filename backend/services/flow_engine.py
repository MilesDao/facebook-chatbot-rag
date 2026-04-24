"""
Flow Engine

Responsibilities:
- Execute conversation flows defined in the database
- Track user's current position in a flow
- Handle node transitions based on user input
"""

from ..database import supabase
from .condition_evaluator import evaluate_condition


def get_active_flow_for_message(workspace_id: str, sender_id: str, user_message: str) -> dict:
    """
    Find a matching active flow based on trigger keywords.
    For the first 2 messages (regardless of input), it prioritizes the DEFAULT flow.
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

        # 1. SPECIAL LOGIC: Force DEFAULT flow for first 2 messages
        from .history_service import get_history
        history = get_history(sender_id, limit=10, workspace_id=workspace_id)
        user_msg_count = len([m for m in history if m.get("role") == "user"])
        
        if user_msg_count < 2:
            for flow in res.data:
                if flow.get("is_default"):
                    print(f"DEBUG: Forcing Default Flow for message #{user_msg_count + 1}")
                    return flow
        
        msg_lower = user_message.lower()
        
        # 2. Check keyword triggers
        for flow in res.data:
            keywords = flow.get("trigger_keywords") or []
            for kw in keywords:
                if kw.lower() in msg_lower:
                    return flow
        
        # 3. Return default flow ONLY for first 2 messages
        if user_msg_count < 2:
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
        # Return a fallback context to allow stateless logic to proceed
        return {
            "workspace_id": workspace_id,
            "sender_id": sender_id,
            "extracted_slots": {},
            "current_flow_id": None,
            "current_node_id": None
        }


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


def get_next_nodes(flow_id: str, current_node_id: str, user_input: str = None, google_key: str = None) -> list:
    """
    Get the next nodes from the current node based on edges and optional user input matching.
    """
    edges = get_flow_edges(flow_id)
    
    # Filter edges from current node
    outgoing = [e for e in edges if e["source"] == current_node_id]
    
    if not outgoing:
        return []
    
    # 1. Match by label (highest priority, e.g. Quick Reply buttons)
    user_lower = user_input.lower().strip()
    for edge in outgoing:
        label = (edge.get("label") or "").lower().strip()
        if label and label in user_lower:
            return [edge["target"]]
    
    # 2. Match by explicit conditions
    best_fallback = None
    for edge in outgoing:
        condition = edge.get("condition")
        if not condition or not isinstance(condition, dict):
            if not best_fallback:
                best_fallback = edge["target"]
            continue
            
        operator = condition.get("operator")
        value = str(condition.get("value", ""))
        
        if not value:
            if not best_fallback:
                best_fallback = edge["target"]
            continue

        # Evaluate based on operator
        matched = False
        if operator == "equals":
            matched = (user_lower == value.lower())
        elif operator == "contains":
            matched = (value.lower() in user_lower)
        elif operator == "llm_match" or not operator:
            # If no operator is specified but a value exists, we treat it as an LLM condition
            # as requested by the user ("LLM would read it and check")
            matched = evaluate_condition(user_input, value, google_key=google_key)
            
        if matched:
            return [edge["target"]]
    
    # 3. Fallback: return the first edge that had no condition (if any)
    if best_fallback:
        return [best_fallback]
    
    # 4. Ultimate fallback: if everything failed but there are outgoing edges, 
    # we return the first one to avoid dead ends (standard flow behavior)
    if outgoing:
        return [outgoing[0]["target"]]
    
    return []


def get_start_node(flow_id: str) -> dict:
    """Get the start/entry node of a flow (first node by position)."""
    nodes = get_flow_nodes(flow_id)
    if not nodes:
        return None
    
    # Find node with no incoming edges (start node)
    edges = get_flow_edges(flow_id)
    target_ids = {e["target"] for e in edges}
    
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
        # If setting as default, unset other flows in the same workspace
        if updates.get("is_default") is True:
            # 1. Get workspace_id for this flow
            flow_res = supabase.table("conversation_flows").select("workspace_id").eq("id", flow_id).limit(1).execute()
            if flow_res.data:
                workspace_id = flow_res.data[0]["workspace_id"]
                # 2. Unset others
                supabase.table("conversation_flows").update({"is_default": False}).eq("workspace_id", workspace_id).execute()

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


def process_flow_interaction(workspace_id: str, sender_id: str, user_message: str, google_key: str = None) -> str:
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

    # 1. SPECIAL LOGIC: Determine current position based on history for first 2 messages
    from .history_service import get_history
    history = get_history(sender_id, limit=5, workspace_id=workspace_id)
    user_msg_count = len([m for m in history if m.get("role") == "user"])

    flow = None
    if user_msg_count < 2:
        # For the first 2 messages, we ignore existing context and force the Default flow
        res = supabase.table("conversation_flows").select("*").eq("workspace_id", workspace_id).eq("is_default", True).execute()
        if res.data:
            flow = res.data[0]
            start_node = get_start_node(flow["id"])
            if user_msg_count == 0:
                current_node_id = start_node["id"] if start_node else None
            else:
                # For message #2, jump to the node after start_node
                if start_node:
                    next_ids = get_next_nodes(flow["id"], start_node["id"], google_key=google_key)
                    current_node_id = next_ids[0] if next_ids else start_node["id"]
            
            current_flow_id = flow["id"]
            # Even if DB update fails due to missing columns, we have our local state
            update_sender_context(workspace_id, sender_id, {
                "current_flow_id": current_flow_id,
                "current_node_id": current_node_id
            })
    
    if not flow and current_flow_id:
        # User is already in a flow, try to continue
        res = supabase.table("conversation_flows").select("*").eq("id", current_flow_id).execute()
        if res.data:
            flow = res.data[0]
    
    if not flow:
        # Check if new flow is triggered via keyword
        flow = get_active_flow_for_message(workspace_id, sender_id, user_message)
        if flow:
            current_flow_id = flow["id"]
            start_node = get_start_node(current_flow_id)
            current_node_id = start_node["id"] if start_node else None
            update_sender_context(workspace_id, sender_id, {
                "current_flow_id": current_flow_id,
                "current_node_id": current_node_id
            })

    if not flow or not current_node_id:
        print(f"DEBUG FlowEngine: No flow or no current_node_id for {sender_id}. flow={bool(flow)}, node_id={current_node_id}")
        return None

    # Execute current node logic — with auto-traversal for non-content nodes
    MAX_HOPS = 10  # Safety limit to prevent infinite loops
    visited_nodes = set()
    reply = None
    active_node_id = current_node_id

    for hop in range(MAX_HOPS):
        if active_node_id in visited_nodes:
            print(f"DEBUG FlowEngine: Cycle detected at node {active_node_id}, breaking")
            break
        visited_nodes.add(active_node_id)

        node_res = supabase.table("flow_nodes").select("*").eq("id", active_node_id).execute()
        if not node_res.data:
            print(f"DEBUG FlowEngine: Node {active_node_id} vanished, resetting context")
            update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
            return None

        node = node_res.data[0]
        node_type = node.get("node_type")
        node_data = node.get("config") or {}
        print(f"DEBUG FlowEngine: Processing node {active_node_id} type={node_type} hop={hop}")

        if node_type == "message":
            reply = node_data.get("content")
            if reply:
                print(f"DEBUG FlowEngine: Got message content: {reply[:60]}...")
            else:
                print(f"DEBUG FlowEngine: Message node has no 'content' in config: {node_data}")
        elif node_type == "handoff":
            reply = "Tính năng chuyển tiếp nhân viên hiện đang được bảo trì. Vui lòng quay lại sau."
        elif node_type == "rag":
            # RAG node: let handle_message do RAG, but still advance the flow cursor
            print(f"DEBUG FlowEngine: RAG node encountered, advancing cursor but delegating response to LLM")
        elif node_type == "logic":
            print(f"DEBUG FlowEngine: Logic node encountered, auto-advancing to next node")

        # Move to next node
        next_node_ids = get_next_nodes(current_flow_id, active_node_id, user_message, google_key=google_key)

        if reply:
            # We have content — update cursor to the next node and return
            if next_node_ids:
                update_sender_context(workspace_id, sender_id, {"current_node_id": next_node_ids[0]})
            else:
                # End of flow
                update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
            return reply

        # No reply from this node — auto-traverse to the next node
        if next_node_ids:
            active_node_id = next_node_ids[0]
            update_sender_context(workspace_id, sender_id, {"current_node_id": active_node_id})
        else:
            # End of flow with no content
            print(f"DEBUG FlowEngine: Reached end of flow with no content for {sender_id}")
            update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
            break

    return reply

