def mock_get_next_nodes(node_map, user_input, outgoing_edges):
    best_fallback = None
    for edge in outgoing_edges:
        label = edge.get("label", "")
        # Simulate the logic I just added
        condition_text = label
        if not condition_text:
            target_node = node_map.get(edge["target"], {})
            condition_text = target_node.get("label", "")
            
        if not condition_text:
            if not best_fallback:
                best_fallback = edge["target"]
            continue
            
        # Simplified LLM mock
        if "phủ nhận" in condition_text and "không" in user_input:
            return [edge["target"]]
            
    return [best_fallback] if best_fallback else []

if __name__ == "__main__":
    node_map = {
        "deny_node": {"label": "(Nếu người nhắn phủ nhận)"},
        "agree_node": {"label": "(Nếu người dùng đồng ý)"}
    }
    
    edges = [
        {"target": "agree_node", "label": ""},
        {"target": "deny_node", "label": ""}
    ]
    
    user_input = "không phải"
    
    result = mock_get_next_nodes(node_map, user_input, edges)
    print(f"Logic Test - Input: '{user_input}' | Result: {result}")
    
    if result == ["deny_node"]:
        print("SUCCESS: Correctly looked ahead to node label and chose Deny!")
    else:
        print("FAILURE: Did not choose correct node.")
