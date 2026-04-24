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

        user_message = user_message or ""
        msg_lower = user_message.lower()
        
        # 1. Check keyword triggers
        for flow in res.data:
            keywords = flow.get("trigger_keywords") or []
            for kw in keywords:
                if kw.lower() in msg_lower:
                    return flow
        
        # 2. Fallback to default flow
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
    
    # Fetch all nodes in the flow to check target node labels if needed
    nodes = get_flow_nodes(flow_id)
    node_map = {n["id"]: n for n in nodes}
    
    user_input = user_input or ""
    user_lower = user_input.lower().strip()
    best_fallback = None
    for edge in outgoing:
        condition = edge.get("condition") or {}
        label = (edge.get("label") or "").strip()
        
        print(f"DEBUG FlowEngine: Edge {edge['id']} | Raw Label: '{label}' | Raw Cond: {condition}")
        
        # Determine the "logic text" to evaluate
        condition_text = str(condition.get("value", "")).strip()
        if not condition_text and label:
            condition_text = label
            
        # NEW: If still no condition text, check the label of the target node itself!
        # This handles "logic" or "condition" nodes where the name is the condition.
        if not condition_text:
            target_node = node_map.get(edge["target"], {})
            node_label = (target_node.get("label") or "").strip()
            # If the node label looks like a condition, use it.
            if node_label:
                condition_text = node_label
                print(f"DEBUG FlowEngine: Using target node label as condition text: '{condition_text}'")
        
        # If there is absolutely no logic text, this is a potential fallback/default edge
        if not condition_text:
            if not best_fallback:
                best_fallback = edge["target"]
            continue

        # Evaluate logic
        operator = condition.get("operator")
        matched = False
        
        if operator == "equals":
            matched = (user_lower == condition_text.lower())
        elif operator == "contains":
            matched = (condition_text.lower() in user_lower)
        else:
            # Default to LLM matching for natural language in values OR labels
            print(f"DEBUG FlowEngine: Evaluating intent for edge '{label}' with condition logic '{condition_text}'")
            matched = evaluate_condition(user_input, condition_text, google_key=google_key)
            
        if matched:
            print(f"DEBUG FlowEngine: Successfully matched edge to {edge['target']} ({label})")
            return [edge["target"]]
    
    # 3. Fallback: Only use the first edge that had NO label and NO condition
    if best_fallback:
        print(f"DEBUG FlowEngine: No matches found, using explicit fallback: {best_fallback}")
        return [best_fallback]
    
    print(f"DEBUG FlowEngine: No matches found for input '{user_input}' and no fallback exists.")
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
    1. Check context.
2. If no flow, try to trigger one.
3. If in flow, handle transitions and hops.
    """
    ctx = get_sender_context(workspace_id, sender_id)
    if not ctx:
        return None
    
    current_flow_id = ctx.get("current_flow_id")
    current_node_id = ctx.get("current_node_id")
    
    # 1. TRIGGER NEW FLOW?
    is_new_flow = False
    if not current_flow_id:
        flow = get_active_flow_for_message(workspace_id, sender_id, user_message)
        if flow:
            current_flow_id = flow["id"]
            start_node = get_start_node(current_flow_id)
            current_node_id = start_node["id"] if start_node else None
            is_new_flow = True
            update_sender_context(workspace_id, sender_id, {
                "current_flow_id": current_flow_id, 
                "current_node_id": current_node_id
            })
    
    if not current_flow_id or not current_node_id:
        return None

    # 2. EXECUTION LOOP (with Hops)
    MAX_HOPS = 10
    visited_nodes = set()
    active_node_id = current_node_id
    
    # If we are RESUMING an existing flow, we must move forward first
    # If we just STARTED a flow, we execute the first node directly
    needs_move = not is_new_flow
    
    for hop in range(MAX_HOPS):
        if active_node_id in visited_nodes:
            break
        visited_nodes.add(active_node_id)
        
        # A. Resolve Node
        node_res = supabase.table("flow_nodes").select("*").eq("id", active_node_id).execute()
        if not node_res.data:
            update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
            return None
        
        node = node_res.data[0]
        node_type = node.get("node_type")
        node_data = node.get("config") or {}
        
        # B. Handle Transition (Move forward using the user's message)
        if needs_move:
            next_node_ids = get_next_nodes(current_flow_id, active_node_id, user_message, google_key=google_key)
            if next_node_ids:
                active_node_id = next_node_ids[0]
                needs_move = False # We moved, now execute this new node
                continue # Re-resolve the new node
            else:
                # End of flow branch
                update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
                return None

        # C. Execute Node
        current_reply = None
        if node_type == "message":
            current_reply = node_data.get("content")
        elif node_type == "handoff":
            current_reply = "Tính năng chuyển tiếp nhân viên hiện đang được bảo trì."
        
        # D. Post-Execution Logic
        if current_reply:
            # We found content! Give it to the user and PAUSE at this node.
            update_sender_context(workspace_id, sender_id, {"current_node_id": active_node_id})
            return current_reply
        else:
            # Transient node (logic, etc.) -> Must move forward immediately using SAME message
            next_node_ids = get_next_nodes(current_flow_id, active_node_id, user_message, google_key=google_key)
            if next_node_ids:
                active_node_id = next_node_ids[0]
                # Continue loop to execute the target node
            else:
                # End of flow
                update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
                break
                
    return None

