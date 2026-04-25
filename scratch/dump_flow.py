import os
from backend.database import supabase

def dump_flow(workspace_id):
    flows = supabase.table("conversation_flows").select("*").eq("workspace_id", workspace_id).execute()
    for flow in flows.data:
        print(f"\nFlow: {flow['name']} ({flow['id']})")
        nodes = supabase.table("flow_nodes").select("*").eq("flow_id", flow["id"]).execute()
        node_map = {n['id']: n for n in nodes.data}
        for node in nodes.data:
            print(f"  Node: {node['node_type']} | ID: {node['id']} | Config: {node['config']}")
        edges = supabase.table("flow_edges").select("*").eq("flow_id", flow["id"]).execute()
        for edge in edges.data:
            src_id = edge['source_node_id']
            tgt_id = edge['target_node_id']
            src_node = node_map.get(src_id)
            tgt_node = node_map.get(tgt_id)
            src_label = src_node['node_type'] if src_node else "UNKNOWN"
            tgt_label = tgt_node['node_type'] if tgt_node else "UNKNOWN"
            print(f"  Edge: {src_label}({src_id}) -> {tgt_label}({tgt_id}) | Label: {edge['label']} | Condition: {edge['condition']}")

if __name__ == "__main__":
    WORKSPACE_ID = "fdfd4eb1-484b-432b-a173-f2418077c16f" # Duong Lien
    dump_flow(WORKSPACE_ID)
