---
name: trace-request
description: Trace a request from API route through service layer to database — understand the full data flow.
triggers: [trace request, follow flow, route to db, end to end, how does this API work]
tools: [search_code, get_symbol_context, get_data_flows, get_dependencies]
schemaVersion: 1
---

# Trace Request

## When to use
- Need to understand what happens when `POST /users` is called
- Tracing a request from controller → service → repository → database
- Debugging an issue that spans multiple layers

## Inputs needed
- Route path or controller name

## Step-by-step

### Step 1: Find the route handler
```
→ search_code { query: "UserController" }
   OR
→ semantic_search { query: "POST /users endpoint" }
```

### Step 2: Get data flows for the route
```
→ get_data_flows { httpPath: "/users" }
```
This shows the complete API → Service → DB chain.

### Step 3: Inspect each layer
For each symbol in the flow:
```
→ get_symbol_context { nodeId: "Method:src/user/user.controller.ts:create" }
→ get_symbol_context { nodeId: "Method:src/user/user.service.ts:createUser" }
```

### Step 4: Check dependencies at each hop
```
→ get_dependencies { nodeId: "Method:src/user/user.service.ts:createUser" }
```
See CALLS, IMPORTS, and EXTENDS relationships.

### Step 5: Build the full picture
Combine the results into a chain:
```
Route: POST /users
  → UserController.create()
    → UserService.createUser()
      → UserRepository.save()
        → DB: users table (WRITES_TO_DB)
```

## Output interpretation
- `get_data_flows` returns chains with `nodes[]` — follow the order
- `get_symbol_context.callees` = what this function calls next
- `get_dependencies` CALLS edges = the call chain

## Pitfalls
- ❌ Don't assume linear flow — check for event emissions (async branching)
- ✅ Check `get_symbol_context.processes` to see if this symbol is part of a larger flow
- ✅ Use `get_data_flows` with `httpPath` filter to narrow results
