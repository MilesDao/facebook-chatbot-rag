---
name: spec-driven-coding
description: Implement a feature guided by Spec Agent business specifications
schemaVersion: 1
triggers: [implement feature, follow spec, use case, build from spec]
tools: [list_projects, get_project_modules, get_active_task_context, check_dependencies, semantic_search_docs]
---

# Spec-Driven Coding

Implement a feature using structured business specifications from Spec Agent.

## When to Use
- You need to implement a feature that has a Use Case defined in Spec Agent
- You want to follow exact acceptance criteria and business rules
- You want to avoid guessing business logic

## Steps

### 1. Discover the project
```
list_projects
```
Find the business project (Spec Agent project) that matches the codebase you're working on. Note the `projectId`.

### 2. Explore modules and use cases
```
get_project_modules(projectId)
```
Returns all modules with their Use Cases. Identify the Use Case that matches the feature you're implementing.

### 3. Load the Use Case context
```
get_active_task_context(useCaseId)
```
Returns:
- **Requirements**: Exact acceptance criteria
- **Steps**: Step-by-step workflow
- **Rules**: Business rules and constraints
- **Actors**: Who can perform this action

### 4. Check for dependencies
```
check_dependencies(useCaseId)
```
Finds if this Use Case depends on other Use Cases (e.g., "Create Order" depends on "User Authentication"). Implement dependencies first.

### 5. Validate against business rules
```
semantic_search_docs("validation rules for [feature]")
```
Search for additional business rules, constraints, or schemas that apply to your implementation.

### 6. Implement with confidence
Now you have:
- Exact requirements (no guessing)
- Step-by-step flow to follow
- Business rules to enforce
- Dependencies to satisfy

Write code that follows these specifications exactly.

## Tips
- Always load `get_active_task_context` before coding — it's free and prevents hallucination
- Use `semantic_search_docs` to find edge cases and validation rules
- If a Use Case has dependencies, implement them in order
