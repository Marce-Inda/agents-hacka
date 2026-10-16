---
description: Resolve merge conflicts with context-aware analysis and safe suggestions
---

# Git Conflict Resolution

I will help you understand and safely resolve merge conflicts by analyzing both sides and preserving the intent of each change.

## Guardrails
- Never auto-resolve without explicit user confirmation for each conflict
- Explain what each side of the conflict represents before suggesting a resolution
- Always preserve intended functionality from both branches where possible
- Run tests after resolution if a test command is available
- If a conflict is semantically ambiguous, ask — don't guess

## Steps

### 1. Identify All Conflicts
Check current conflict status:

// turbo
```bash
git status
```

List all conflicted files and count the number of conflict markers in each:
```bash
grep -rl "<<<<<<" . --include="*.{js,ts,py,go,rs,java,md,json,yaml,yml}" 2>/dev/null
```

### 2. Understand the Context
Before touching anything:
- What branches are being merged? (`git log --merge --oneline -10`)
- What is the goal of each branch?
- Are there related tickets or PRs that explain the intent?

Ask the user if context is unclear.

### 3. Analyze Each Conflict
For each conflicted file:
- Show the conflict markers and surrounding context (≥5 lines each side)
- Explain what the `HEAD` (current branch) version contains
- Explain what the `incoming` version contains
- Identify if changes are overlapping or independent

### 4. Suggest Resolution Strategy
For each conflict, recommend one of:

| Strategy | When to Use |
|----------|-------------|
| **Keep ours** (`git checkout --ours <file>`) | Your changes must take precedence |
| **Keep theirs** (`git checkout --theirs <file>`) | Incoming changes are correct |
| **Merge both** | Both changes are needed and compatible — manually combine |
| **Manual rewrite** | Changes conflict semantically, a new approach is needed |

Always confirm with the user before applying.

### 5. Resolve Conflicts
After user confirms the approach for each conflict:
- Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- Apply the agreed resolution cleanly
- Stage the resolved file: `git add <file>`

### 6. Verify Resolution
After resolving all conflicts:

```bash
git diff --staged
```

Run tests if available:
```bash
# npm test / pytest / go test / cargo test — detect from project
```

Ensure the code compiles and runs before completing the merge.

### 7. Complete the Merge
Once all conflicts are resolved and verified:

```bash
git status   # confirm no remaining conflicts
git commit   # use the auto-generated merge commit message or customize it
```

## Principles
- **Understand before resolving** — reading the intent of both sides is non-negotiable
- **When in doubt, ask** — a wrong resolution is worse than a slow one
- **Test after resolving** — merge conflicts often introduce subtle bugs
- **Document complex resolutions** — leave a note in the commit message body explaining non-obvious merge decisions

## Reference
- `git log --merge` — shows commits involved in the conflict
- `git diff` — shows current unresolved conflicts
- `git checkout --ours <file>` / `git checkout --theirs <file>` — bulk resolution for binary or generated files
- `git mergetool` — open a visual merge tool if configured
