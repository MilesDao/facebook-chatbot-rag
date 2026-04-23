---
name: plan-refactor
description: Plan a refactor by mapping blast radius, grouping by module, and scoping safe incremental steps.
triggers: [refactor, restructure, decompose, extract, split module, plan migration]
tools: [blast_radius, get_symbol_context, get_architecture, search_code]
schemaVersion: 1
---

# Plan Refactor

## When to use
- Planning to extract a service, split a module, or restructure code
- Need to understand the full scope of a refactor
- Want to break a large refactor into safe incremental steps

## Inputs needed
- Target class/module/function to refactor

## Step-by-step

### Step 1: Map the blast radius (both directions)
```
→ blast_radius { target: "LargeService", direction: "both", maxDepth: 3 }
```
Get the full picture: who depends on this, and what it depends on.

### Step 2: Get detailed context
```
→ get_symbol_context { name: "LargeService" }
```
Understand: callers, callees, processes, routes, DB access.

### Step 3: Group affected symbols by module/file
From blast radius results, group `byDepth[*].symbols` by their `file` path:
```
src/auth/     → 5 symbols affected
src/user/     → 3 symbols affected
src/payment/  → 1 symbol affected
```
Each group = one potential work package.

### Step 4: Identify safe boundaries
Look for natural cut points:
- Interfaces/abstractions between modules
- Functions with few callers (low coupling)
- Files that only depend on the target (not vice versa)

### Step 5: Plan incremental steps
Order your refactor:
1. **Leaf changes first** — things no one else depends on
2. **Interface extraction** — create abstractions before moving code
3. **Internal restructure** — change implementation behind the interface
4. **Consumer migration** — update callers one by one

### Step 6: Validate each step
After each incremental change:
```
→ detect_changes { diff: "<your changes>" }
```
Verify risk level stays manageable.

## Output interpretation
- `riskLevel: CRITICAL` → break into smaller pieces
- `affectedProcesses` → business flows that need regression testing
- Many `affectedRoutes` → consider feature flag approach

## Pitfalls
- ❌ Don't refactor everything at once — break into incremental PRs
- ❌ Don't ignore DB access patterns — ORM changes cascade differently
- ✅ Use `direction: "both"` to see full picture
- ✅ Check `affectedRoutes` to identify feature-flag candidates
- ✅ Run `detect_changes` after each step to validate
