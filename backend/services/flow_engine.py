"""
Flow Engine

Responsibilities:
- Execute conversation flows defined in the database
- Track user's current position in a flow
- Handle node transitions based on user input
"""

from ..database import supabase
from ..rag_pipeline import retrieve_context
from ..google_ai_integration import generate_response
from .history_service import get_history
from .condition_evaluator import evaluate_condition


def _evaluate_slot_logic(logic_text: str, extracted_slots: dict) -> bool | None:
    """
    Evaluate slot-based logic syntax.
    Supported formats:
      - slot:has_phone
      - slot:has_phone=true
      - slot:has_phone=false
      - slot:industry=it
      - slot:industry!=it
    Returns True/False if the expression is slot-based, otherwise None.
    """
    if not logic_text:
        return None
    text = logic_text.strip()
    if not text.lower().startswith("slot:"):
        return None

    slots = extracted_slots or {}
    expr = text[5:].strip()

    operator = None
    if ">=" in expr:
        key, value = expr.split(">=", 1)
        operator = ">="
    elif "<=" in expr:
        key, value = expr.split("<=", 1)
        operator = "<="
    elif ">" in expr:
        key, value = expr.split(">", 1)
        operator = ">"
    elif "<" in expr:
        key, value = expr.split("<", 1)
        operator = "<"
    elif "!=" in expr:
        key, value = expr.split("!=", 1)
        operator = "!="
    elif "=" in expr:
        key, value = expr.split("=", 1)
        operator = "="
    else:
        key, value = expr, None

    slot_key = key.strip()
    slot_value = slots.get(slot_key)

    if value is None:
        return bool(slot_value)

    expected = value.strip().lower()
    actual = str(slot_value).strip().lower() if slot_value is not None else ""

    # Numeric comparison when possible
    if operator in (">", ">=", "<", "<="):
        try:
            actual_num = float(actual)
            expected_num = float(expected)
        except ValueError:
            return False
        if operator == ">":
            return actual_num > expected_num
        if operator == ">=":
            return actual_num >= expected_num
        if operator == "<":
            return actual_num < expected_num
        if operator == "<=":
            return actual_num <= expected_num

    if operator == "!=":
        return actual != expected
    return actual == expected


def _pause_sender(workspace_id: str, sender_id: str):
    """Pause AI responses for a sender (handoff)."""
    if not supabase:
        return
    try:
        supabase.table("paused_senders").delete().eq("workspace_id", workspace_id).eq("sender_id", sender_id).execute()
        supabase.table("paused_senders").insert({"workspace_id": workspace_id, "sender_id": sender_id}).execute()
    except Exception as e:
        print(f"Error pausing sender {sender_id}: {e}")


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
            ctx = res.data[0]
            slots = ctx.get("extracted_slots") or {}
            detected_phone = ctx.get("detected_phone")
            if detected_phone:
                slots.setdefault("detected_phone", detected_phone)
                slots.setdefault("phone", detected_phone)
                slots.setdefault("has_phone", True)
                ctx["extracted_slots"] = slots
            return ctx
        
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


def get_next_nodes(flow_id: str, current_node_id: str, user_input: str, google_key: str = None, extracted_slots: dict = None) -> list[str]:
    """
    Find the next node(s) based on outgoing edges and user input.
    Optimized for SPEED:
    1. Fast Match: Simple string containment.
    2. Slot Match: Logic starting with 'slot:'.
    3. Batch Match: All natural language intents evaluated in ONE LLM call.
    """
    edges = get_flow_edges(flow_id)
    # Filter edges from current node
    outgoing = [e for e in edges if e["source"] == current_node_id]
    
    if not outgoing:
        return []

    # Fetch all nodes in the flow to check target node labels if needed
    nodes = get_flow_nodes(flow_id)
    node_map = {n["id"]: n for n in nodes}
    
    user_input = (user_input or "").strip()
    user_lower = user_input.lower()
    
    candidates = [] # List of (target_id, logic_text, type)
    best_fallback = None

    for edge in outgoing:
        condition = edge.get("condition") or {}
        label = (edge.get("label") or "").strip()
        
        # Determine the "logic text" to evaluate
        logic_text = str(condition.get("value", "")).strip()
        if not logic_text and label:
            logic_text = label
            
        if not logic_text:
            target_node = node_map.get(edge["target"], {})
            target_data = target_node.get("data") or target_node.get("config") or {}
            node_logic = (target_data.get("keyword", "") or target_node.get("label", "") or "").strip()
            if node_logic:
                logic_text = node_logic
        
        if not logic_text:
            if not best_fallback:
                best_fallback = edge["target"]
            continue

        # 1. FAST MATCH (No LLM needed)
        # If it's a simple word/phrase (no "Nếu", "Khi", or "slot:"), check containment
        if not logic_text.startswith("slot:") and len(logic_text.split()) <= 4:
            clean_logic = logic_text.lower()
            if clean_logic in user_lower or user_lower in clean_logic:
                print(f"DEBUG FlowEngine: Fast Match found for '{logic_text}'")
                return [edge["target"]]

        # 2. SLOT MATCH (Categorized for later)
        if logic_text.startswith("slot:"):
            candidates.append({"id": edge["target"], "logic": logic_text, "type": "slot"})
        else:
            # 3. LLM CANDIDATE (Categorized for batch processing)
            candidates.append({"id": edge["target"], "logic": logic_text, "type": "llm"})

    # Evaluate candidates
    llm_prompts = []
    llm_targets = []
    
    for cand in candidates:
        if cand["type"] == "slot":
            res = _evaluate_slot_logic(cand["logic"], extracted_slots or {})
            if res is True:
                print(f"DEBUG FlowEngine: Slot Match found for '{cand['logic']}'")
                return [cand["id"]]
        else:
            llm_prompts.append(cand["logic"])
            llm_targets.append(cand["id"])

    # 4. BATCH LLM MATCH
    if llm_prompts:
        from .condition_evaluator import select_best_logic
        best_idx = select_best_logic(user_input, llm_prompts, google_key=google_key)
        if best_idx is not None and 0 <= best_idx < len(llm_targets):
            target_id = llm_targets[best_idx]
            print(f"DEBUG FlowEngine: Batch LLM Match found: '{llm_prompts[best_idx]}'")
            return [target_id]

    # 5. FALLBACK
    if best_fallback:
        print(f"DEBUG FlowEngine: Using fallback: {best_fallback}")
        return [best_fallback]
    
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
                "label": node.get("data", {}).get("label", "") or node.get("data", {}).get("keyword", "") or node.get("data", {}).get("content", ""),
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


def process_flow_interaction(workspace_id: str, sender_id: str, user_message: str, google_key: str = None) -> tuple[str | None, bool]:
    """
    Core engine logic:
    1. Check context.
    2. If no flow, try to trigger one.
    3. If in flow, handle transitions and hops.
    Returns (reply_text, handoff_triggered).
    """
    handoff_triggered = False
    ctx = get_sender_context(workspace_id, sender_id)
    if not ctx:
        return None, False
    
    current_flow_id = ctx.get("current_flow_id")
    current_node_id = ctx.get("current_node_id")
    extracted_slots = ctx.get("extracted_slots") or {}
    
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
        return None, False

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
            if node_type == "rag":
                repeat_count_raw = node_data.get("repeat_count", 1)
                try:
                    repeat_count = int(repeat_count_raw)
                except Exception:
                    repeat_count = 1
                if repeat_count < 0:
                    repeat_count = 0
                rag_counter_key = f"rag_repeat_{active_node_id}"
                current_count = int(extracted_slots.get(rag_counter_key, 0) or 0)
                # repeat_count == 0 means infinite repeats
                if repeat_count == 0 or current_count < repeat_count:
                    needs_move = False
            next_node_ids = get_next_nodes(
                current_flow_id,
                active_node_id,
                user_message,
                google_key=google_key,
                extracted_slots=extracted_slots
            )
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
        pause_node_id = None
        if node_type == "message":
            current_reply = node_data.get("content")
        elif node_type == "rag":
            # Use RAG + LLM to answer based on knowledge base
            context_str, similarity_score = retrieve_context(
                user_message,
                workspace_id=workspace_id,
                api_key=google_key
            )
            history = get_history(sender_id, limit=20, workspace_id=workspace_id)
            rag_threshold = 0.5
            repeat_count_raw = node_data.get("repeat_count", 1)
            try:
                repeat_count = int(repeat_count_raw)
            except Exception:
                repeat_count = 1
            if repeat_count < 0:
                repeat_count = 0

            rag_counter_key = f"rag_repeat_{active_node_id}"
            current_count = int(extracted_slots.get(rag_counter_key, 0) or 0)
            next_count = current_count + 1
            extracted_slots[rag_counter_key] = next_count
            extracted_slots["rag_score"] = similarity_score
            extracted_slots[f"rag_score_{active_node_id}"] = similarity_score

            # If RAG score is below threshold, attempt to route to a fallback message node
            if similarity_score < rag_threshold:
                next_node_ids = get_next_nodes(
                    current_flow_id,
                    active_node_id,
                    user_message,
                    google_key=google_key,
                    extracted_slots=extracted_slots
                )
                if next_node_ids:
                    target_id = next_node_ids[0]
                    target_res = supabase.table("flow_nodes").select("*").eq("id", target_id).execute()
                    if target_res.data:
                        target_node = target_res.data[0]
                        target_type = target_node.get("node_type")
                        target_data = target_node.get("config") or {}
                        if target_type == "logic":
                            follow_nodes = get_next_nodes(
                                current_flow_id,
                                target_id,
                                user_message,
                                google_key=google_key,
                                extracted_slots=extracted_slots
                            )
                            if follow_nodes:
                                target_id = follow_nodes[0]
                                target_res = supabase.table("flow_nodes").select("*").eq("id", target_id).execute()
                                if target_res.data:
                                    target_node = target_res.data[0]
                                    target_type = target_node.get("node_type")
                                    target_data = target_node.get("config") or {}
                        if target_type == "message":
                            current_reply = target_data.get("content")
                            pause_node_id = active_node_id
                        elif target_type == "handoff":
                            current_reply = target_data.get("content") or "Mình đã chuyển cho nhân viên hỗ trợ rồi ạ."
                            _pause_sender(workspace_id, sender_id)
                            update_sender_context(workspace_id, sender_id, {
                                "current_flow_id": None,
                                "current_node_id": None,
                                "extracted_slots": extracted_slots
                            })
                            return current_reply, True

            if not current_reply:
                bot_res = generate_response(
                    user_message,
                    context_str,
                    history,
                    google_key=google_key
                )
                append_text = (node_data.get("append_text") or node_data.get("cta") or "").strip()
                if append_text:
                    current_reply = f"{bot_res.answer}[SPLIT]{append_text}"
                else:
                    current_reply = bot_res.answer

            # If repeats remain (or infinite), pause back on this RAG node
            if repeat_count == 0 or next_count < repeat_count:
                pause_node_id = active_node_id

            update_sender_context(workspace_id, sender_id, {"extracted_slots": extracted_slots})
        elif node_type == "handoff":
            current_reply = node_data.get("content") or "Mình đã chuyển cho nhân viên hỗ trợ rồi ạ."
            _pause_sender(workspace_id, sender_id)
            update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
            return current_reply, True
        
        # D. Post-Execution Logic
        if current_reply:
            # We found content! Give it to the user and PAUSE at this node.
            update_sender_context(workspace_id, sender_id, {"current_node_id": pause_node_id or active_node_id})
            return current_reply, False
        else:
            # Transient node (logic, etc.) -> Must move forward immediately using SAME message
            next_node_ids = get_next_nodes(
                current_flow_id,
                active_node_id,
                user_message,
                google_key=google_key,
                extracted_slots=extracted_slots
            )
            if next_node_ids:
                active_node_id = next_node_ids[0]
                # Continue loop to execute the target node
            else:
                # End of flow
                update_sender_context(workspace_id, sender_id, {"current_flow_id": None, "current_node_id": None})
                break
                
    return None, False
