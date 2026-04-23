---
name: workspace-context
description: Bootstrap workspace-aware AI coding — auto-discover related repos and specs from .grapuco/config.json
schemaVersion: 1
triggers: [start coding, what project, workspace, context, which repo, what am I working on, bootstrap]
tools: [bootstrap, list_workspaces, get_project_modules, get_active_task_context]
---

# Workspace Context

Automatically discover your workspace context from `.grapuco/config.json` so you know which repos and spec projects are related.

## When to Use
- Starting a new coding session in a Grapuco-initialized project
- Need to understand which repos and spec projects are related
- Want to auto-load business specs for the current codebase
- User asks "what project am I working on?" or "what's the context?"

## Steps

### 1. Read local config
Check if the project has a `.grapuco/config.json` file. Extract `repoId` and `workspaceId`.

```json
{
  "repoId": "repo_xxx",
  "workspaceId": "ws_yyy"
}
```

### 2. Bootstrap with workspace context
```
bootstrap(workspaceId: "ws_yyy", repositoryId: "repo_xxx")
```

This returns:
- **currentRepo**: The repo you're working in right now
- **workspace**: All linked repos and spec projects in this workspace
- **toolCatalog**: Available MCP tools
- **recommendedFirstMoves**: Context-aware suggestions

### 3. Explore spec projects (if any)
If the workspace has spec projects, load their structure:
```
get_project_modules(projectId)
```
Now you understand the full business domain governing this code.

### 4. Load specific Use Case context
When implementing a feature, load the exact requirements:
```
get_active_task_context(useCaseId)
```

### 5. Start coding with full context
You now know:
- Which repo you're working in
- What other repos share the same workspace
- What business specs and Use Cases govern this code
- Which Use Cases to follow for implementation

## Tips
- Always call `bootstrap(workspaceId, repositoryId)` at session start — it's free
- If no `.grapuco/config.json` exists, fall back to `bootstrap()` without params
- The workspace groups related repos together — changes in one may affect others
- Use `search_code` or `semantic_search` to find implementation details across all repos in the workspace
