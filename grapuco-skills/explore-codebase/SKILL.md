---
name: explore-codebase
description: Onboard a new/unfamiliar codebase — discover structure, entry points, and key flows in minutes.
triggers: [onboard, explore, new repo, understand codebase, what does this project do]
tools: [list_repositories, get_architecture, search_code, semantic_search, get_symbol_context, get_data_flows]
schemaVersion: 1
---

# Explore Codebase

## When to use
- First time working with a repository
- Joining a new team and need to understand the architecture
- Asked "what does this codebase do?" or "where is X?"

## Inputs needed
- Repository ID (or use `list_repositories` to discover)

## Step-by-step

### Step 1: Discover repos
```
→ list_repositories
```
Note the repo ID and name. Pick the target repo.

### Step 2: Get architecture overview
```
→ get_architecture { repositoryId: "..." }
```
This returns ALL nodes and edges. Scan for:
- **Classes/Modules** — the building blocks
- **Entry points** (kind: main/route/test) — where execution starts
- **CALLS edges** — who calls whom

### Step 3: Find key entry points
```
→ search_code { query: "Controller" }
→ search_code { query: "main" }
```
Identify HTTP controllers, main functions, CLI entry points.

### Step 4: Trace a request flow
Pick an interesting route/entry point, then:
```
→ get_symbol_context { nodeId: "..." }
```
See callers, callees, processes, DB access, routes.

### Step 5: Explore data flows
```
→ get_data_flows { repositoryId: "..." }
```
Shows API → Service → DB chains end-to-end.

### Step 6: Ask natural language questions
```
→ semantic_search { query: "how does authentication work?" }
```

## Output interpretation
- **get_architecture**: Large JSON — focus on node counts per label and edge types
- **get_symbol_context**: Look at `callers` (who uses this?) and `callees` (what does it call?)
- **get_data_flows**: Each flow = one API → service → DB chain

## Pitfalls
- ❌ Don't call `get_architecture` on very large repos first — start with `search_code`
- ❌ Don't assume node IDs — always discover them via `search_code` or `get_architecture`
- ✅ Start broad (architecture) → narrow (symbol context) → deep (data flows)
