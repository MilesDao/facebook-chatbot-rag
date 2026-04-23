---
name: pre-commit-check
description: Run impact analysis on your git diff before committing — catch risky changes early.
triggers: [pre-commit, before commit, git diff check, review changes, CI check]
tools: [detect_changes]
schemaVersion: 1
---

# Pre-Commit Check

## When to use
- Before running `git commit`
- As part of a code review workflow
- When you want to understand the blast radius of your uncommitted changes

## Inputs needed
- Git diff output (unified format)

## Step-by-step

### Step 1: Get the diff
In your terminal, run:
```bash
git diff          # unstaged changes
git diff --cached # staged changes
git diff HEAD     # all changes vs HEAD
```

### Step 2: Run detect_changes
```
→ detect_changes { diff: "<paste the diff output here>" }
```

### Step 3: Interpret results
The tool returns:
- `changedSymbols`: functions/classes directly modified in the diff
- `impactedSymbols`: other symbols affected via call chains
- `affectedRoutes`: API endpoints impacted
- `riskLevel`: overall risk assessment

### Step 4: Act on the results
| Risk Level | Action |
|------------|--------|
| LOW | Commit with confidence |
| MEDIUM | Review impacted symbols, add tests if needed |
| HIGH | Split into smaller commits, test each route |
| CRITICAL | Get a code review before committing |

## Output interpretation
- `changedSymbols` with `confidence < 0.8` → range mapping uncertain, verify manually
- Multiple `affectedRoutes` → your change touches several API endpoints
- `impactedSymbols` at depth > 2 → transitive impact, less likely to break

## Pitfalls
- ❌ Don't pass truncated diffs — include all hunks for accurate mapping
- ❌ Don't ignore CRITICAL risk — it means many dependents will be affected
- ✅ Use `git diff HEAD` to capture both staged and unstaged changes
