---
name: rename-symbol
description: Safely rename a symbol across multiple files — preview all edits and conflicts before applying.
triggers: [rename, refactor name, change name, rename function, rename class]
tools: [get_symbol_context, rename_symbol, search_code]
schemaVersion: 1
---

# Rename Symbol

## When to use
- Renaming a function, class, method, or variable
- Want to see ALL places that reference the old name
- Need conflict detection before applying

## Inputs needed
- Current symbol name or nodeId
- New name

## Step-by-step

### Step 1: Find the symbol
```
→ search_code { query: "oldFunctionName" }
```
Get the exact `nodeId` from the results.

### Step 2: Check context (optional but recommended)
```
→ get_symbol_context { nodeId: "..." }
```
Understand how widely this symbol is used before renaming.

### Step 3: Preview the rename (dry run)
```
→ rename_symbol {
    symbolId: "Function:src/utils.ts:oldFunctionName",
    newName: "newFunctionName",
    dryRun: true
  }
```

### Step 4: Review results
The tool returns:
- `graphEdits`: High-confidence edits (declaration, call sites, imports, exports)
- `textualCandidates`: Lower-confidence matches (strings, comments)
- `conflicts`: Name collisions in same scope
- `summary`: Total edits, files affected, has conflicts

### Step 5: Handle conflicts
If `hasConflicts: true`:
- Check `conflicts[]` for details
- Consider using a different name or resolving scope conflicts first

### Step 6: Apply (when confident)
```
→ rename_symbol {
    symbolId: "...",
    newName: "newFunctionName",
    dryRun: false
  }
```

## Output interpretation
- `graphEdits` with `category: 'declaration'` → the definition itself
- `graphEdits` with `category: 'call-site'` → every place that calls this symbol
- `textualCandidates` → string/comment references, review manually

## Pitfalls
- ❌ Don't skip dry run — always preview first
- ❌ Don't rename to a language keyword (`class`, `return`, etc.)
- ✅ Use `includeTextual: true` to catch string references (API docs, logs)
- ✅ Check `conflicts` before applying — same-scope collision will cause errors
