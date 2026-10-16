---
description: Interactive rebase assistance for cleaning git history safely
---

# Git Rebase

I will help you perform interactive rebases to clean up your git history — squashing, reordering, rewording, or dropping commits — safely and with full understanding of each step.

## Guardrails
- **Never rebase commits that have already been pushed to a shared branch** without an explicit warning and user confirmation
- Always create a backup branch before rebasing
- Explain each step before executing it
- If a conflict occurs mid-rebase, pause and analyze before proceeding
- Prefer `--force-with-lease` over `--force` when pushing after rebase

## Steps

### 1. Understand the Goal
Ask clarifying questions:
- What do you want to achieve? (squash WIP commits / reorder / edit a message / drop a commit)
- How many commits back? (`HEAD~N` or a specific commit hash?)
- Has this branch been pushed? Is it shared with others?

### 2. Inspect Current History
Review what we're working with:

// turbo
```bash
git log --oneline -20
```

```bash
git status  # ensure working directory is clean
```

If there are unstaged changes, stash first:
```bash
git stash
```

### 3. Create a Safety Backup
Before touching history:

```bash
git branch backup/<branch-name>-before-rebase
```

This gives us a fallback: `git reset --hard backup/<branch-name>-before-rebase`

### 4. Start Interactive Rebase

```bash
git rebase -i HEAD~<n>   # replace <n> with number of commits
# or
git rebase -i <base-commit-hash>
```

### 5. Choose Actions for Each Commit
In the rebase editor, mark each commit with one of:

| Command | Alias | Action |
|---------|-------|--------|
| `pick` | `p` | Keep commit as-is |
| `reword` | `r` | Keep commit, edit the message |
| `edit` | `e` | Keep commit, pause to amend files |
| `squash` | `s` | Combine with previous commit (keep both messages) |
| `fixup` | `f` | Combine with previous, discard this message |
| `drop` | `d` | Remove this commit entirely |
| `exec` | `x` | Run a shell command after this commit |

**Common patterns:**
- Squash WIP commits: mark all but first as `squash` or `fixup`
- Fix a commit message: mark it `reword`
- Remove a debug/temp commit: mark it `drop`

### 6. Handle Conflicts (if any)
If a conflict occurs during rebase:
- Resolve the conflict in the file
- Stage the resolved file: `git add <file>`
- Continue the rebase: `git rebase --continue`

To abort the entire rebase and return to the original state:
```bash
git rebase --abort
```

### 7. Verify History
After the rebase completes:

// turbo
```bash
git log --oneline -20
```

Run tests to confirm nothing broke:
```bash
# detect test command from project (npm test / pytest / go test)
```

### 8. Push (if needed)
If the branch was previously pushed, a force push is required:

```bash
git push --force-with-lease origin <branch-name>
```

`--force-with-lease` is safer than `--force` — it fails if someone else pushed in the meantime.

Communicate to teammates if they have a local copy of this branch — they'll need to `git fetch && git reset --hard origin/<branch-name>`.

## Principles
- **Don't rebase public/shared branches** without coordination
- **Squash related commits** before merging a feature branch to keep history clean
- **Write clear commit messages** during reword — this is the moment to improve them
- **Test after rebasing** — rebase can silently break things if commits are reordered

## Reference
- `git reflog` — recover a lost commit if something goes wrong
- `git log --graph --oneline --all` — visualize branch topology
- `git rebase --onto <newbase> <upstream> <branch>` — advanced: transplant a branch
- [Git Book: Rebase](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)
