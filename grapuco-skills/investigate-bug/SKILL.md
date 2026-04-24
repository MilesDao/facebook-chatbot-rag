---
name: investigate-bug
description: Investigate a bug using stack trace — trace each frame, find upstream causes, and scope the fix.
triggers: [bug, error, stack trace, debug, exception, crash, investigate]
tools: [search_code, get_symbol_context, blast_radius, get_dependencies]
schemaVersion: 1
---

# Investigate Bug

## When to use
- Have a stack trace or error message
- Need to find root cause across multiple files
- Want to understand what flows through the failing code

## Inputs needed
- Stack trace, error message, or failing function name

## Step-by-step

### Step 1: Identify the failing symbol
Extract function/method names from the stack trace, then:
```
→ search_code { query: "failingFunctionName" }
```

### Step 2: Get context for the failing symbol
```
→ get_symbol_context { nodeId: "..." }
```
Look at:
- `callers` — who is calling this function? (potential source of bad input)
- `callees` — what does it call? (potential downstream failure)
- `heritage` — is it overriding something? (polymorphism issue?)

### Step 3: Walk up the stack
For each frame in the stack trace (bottom to top):
```
→ get_symbol_context { name: "callerFunction" }
```
Build a picture of data flow leading to the error.

### Step 4: Check upstream impact
```
→ blast_radius { target: "failingSymbol", direction: "upstream" }
```
Find all paths that lead to this code — one of them has the bug.

### Step 5: Check dependencies
```
→ get_dependencies { nodeId: "..." }
```
Look for IMPORTS that might be version-mismatched or CALLS to external libs.

### Step 6: Scope the fix
Once root cause is identified:
```
→ blast_radius { target: "rootCauseSymbol", direction: "downstream" }
```
Ensure your fix doesn't break other things.

## Output interpretation
- `callers` at depth 1 = most likely source of bad input
- `blast_radius.byDepth[0]` = immediate dependents that also need checking
- `heritage.parents` = check if base class contract was violated

## Pitfalls
- ❌ Don't assume the failing line IS the bug — it's often the symptom
- ❌ Don't fix without checking downstream blast radius
- ✅ Start from the deepest stack frame and work upward
- ✅ Check `processes` — the bug might affect an entire business flow
