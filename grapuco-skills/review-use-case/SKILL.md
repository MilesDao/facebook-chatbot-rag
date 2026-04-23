---
name: review-use-case
description: Review and understand a Use Case before implementation
schemaVersion: 1
triggers: [review spec, understand use case, check requirements, what should I build]
tools: [list_projects, get_project_modules, get_active_task_context, check_dependencies]
---

# Review Use Case

Understand a Use Case's full scope before writing any code.

## When to Use
- Before starting work on a new feature
- When you need to understand what a Use Case requires
- When checking if a feature is fully specified

## Steps

### 1. Find the project
```
list_projects
```
Lists all Spec Agent projects. Pick the one matching your codebase.

### 2. Browse modules
```
get_project_modules(projectId)
```
See all modules and their Use Cases. Identify the one you need.

### 3. Read the full spec
```
get_active_task_context(useCaseId)
```
Returns the complete specification:
- **Requirements**: What must be true when this feature works
- **Steps**: The exact flow (main + alternative paths)
- **Rules**: Business constraints (e.g., "max 3 items per user")
- **Actors**: Who can trigger this use case

### 4. Map dependencies
```
check_dependencies(useCaseId)
```
Find out:
- Which Use Cases this one depends on
- Which Use Cases depend on this one
- The implementation order

## Output
After reviewing, you should be able to answer:
1. What are the inputs and outputs?
2. What are the business rules?
3. What edge cases exist?
4. What's the dependency chain?
