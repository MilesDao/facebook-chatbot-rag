---
name: safe-edit
description: Check impact before editing code — get context, blast radius, and suggest tests to validate changes.
triggers: [before edit, safe change, impact check, what will break, refactor safety]
tools: [get_symbol_context, blast_radius, get_data_flows]
schemaVersion: 1
---

# Safe Edit

## When to use
- Before modifying a function/class/method
- Need to know "what will break if I change this?"
- Planning a refactor and want to scope the risk

## Inputs needed
- Symbol name or nodeId of what you plan to change

## Step-by-step

### Step 1: Get full context
```
→ get_symbol_context { name: "UserService" }
   OR
→ get_symbol_context { nodeId: "Class:src/user/user.service.ts:UserService" }
```
Review: who calls this? what does it call? what processes use it?

### Step 2: Check blast radius
```
→ blast_radius { target: "UserService", direction: "both" }
```
Understand upstream (who depends on this) and downstream (what this depends on).

Look at:
- `riskLevel`: LOW/MEDIUM/HIGH/CRITICAL
- `byDepth[0]`: immediate dependents (most likely to break)
- `affectedRoutes`: API endpoints that will be impacted
- `affectedProcesses`: business flows that touch this symbol

### Step 3: Check data flow impact
```
→ get_data_flows { repositoryId: "..." }
```
Filter for flows touching your symbol's file.

### Step 4: Plan your edit
Based on the blast radius:
- **LOW risk**: proceed with confidence
- **MEDIUM**: write tests for depth-1 callers
- **HIGH/CRITICAL**: consider a phased approach, test all affected routes

## Output interpretation
- `riskLevel: CRITICAL` = ≥20 direct dependents or touches ≥3 routes → be very careful
- `affectedProcesses` = business flows that need regression testing

## Pitfalls
- ❌ Don't skip blast radius for "simple" changes — even renaming a field can cascade
- ❌ Don't ignore `affectedRoutes` — they represent user-facing impact
- ✅ Always check depth-1 first (immediate callers) — they break first
