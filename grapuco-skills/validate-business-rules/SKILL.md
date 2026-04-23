---
name: validate-business-rules
description: Search and validate business rules relevant to your current implementation
schemaVersion: 1
triggers: [business rules, validation, constraints, domain rules, check rules]
tools: [semantic_search_docs, get_active_task_context, check_dependencies]
---

# Validate Business Rules

Find and enforce business rules before or during implementation.

## When to Use
- You're implementing validation logic and want to check for documented rules
- You want to verify your code follows the business constraints
- You need to discover edge cases defined in the spec

## Steps

### 1. Search for relevant rules
```
semantic_search_docs("payment validation rules")
semantic_search_docs("user permissions for admin module")
semantic_search_docs("order status transitions")
```
Use natural language to find rules, constraints, and schemas. Search is semantic — you don't need exact keywords.

### 2. Cross-check with Use Case
```
get_active_task_context(useCaseId)
```
Load the Use Case rules section to see if there are constraints you missed.

### 3. Check dependency constraints
```
check_dependencies(useCaseId)
```
Dependencies may have their own rules that affect your implementation (e.g., "User must be authenticated before creating an order").

### 4. Apply rules to code
Map each discovered rule to a code implementation:
- Validation rules → DTO validators / guard clauses
- State transitions → Enum/FSM checks
- Permission rules → Guards / middleware
- Data constraints → Database schemas / checks

## Example Queries
- `"what happens when payment fails"` — find error-handling rules
- `"free plan limitations"` — find tier-based constraints
- `"required fields for order"` — find validation schemas
- `"who can approve refund"` — find role-based access rules

## Tips
- Run this skill early — discovering rules late leads to rework
- Combine with `get_symbol_context` to verify rules are already enforced in existing code
