---
description: Create comprehensive pull request descriptions from commits and diffs
---

# Git PR

I will help you craft a complete, well-structured pull request description based on your branch's commits and changes.

## Guardrails
- Analyze commits on the current branch vs target branch
- Never modify any code — only generate PR content
- Follow the project's existing PR template if one exists in `.github/`
- Highlight breaking changes prominently
- Don't invent details not supported by the diff

## Steps

### 1. Understand Context
Ask clarifying questions:
- What is the target branch? (usually `main` or `develop`)
- Is there a linked issue number?
- Is this a feature, bug fix, refactor, or something else?
- Are there breaking changes?

### 2. Analyze Changes
Gather information about the PR:

// turbo
```bash
git log main..HEAD --oneline
```

```bash
git diff main --stat
```

Review the actual diff for deeper context:
```bash
git diff main
```

### 3. Check for PR Template
Look for existing templates:
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/pull_request_template.md`
- `.github/PULL_REQUEST_TEMPLATE/` (directory with multiple templates)

If found, use that structure exactly.

### 4. Generate PR Content

**Title:**
`<type>(<scope>): <brief description>`

Follow conventional commits format to match the project's commit style.

**Description:**

```markdown
## Summary
Brief summary of what this PR does and why.

## Changes
- List of specific changes made
- Bullet points for clarity
- Group by area (frontend / backend / tests / docs)

## Related Issue
Closes #<issue-number>

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor (no functional change)
- [ ] Performance improvement
- [ ] Documentation
- [ ] Breaking change

## Breaking Changes
<!-- If none, remove this section -->
- List any breaking changes and migration steps

## Testing
How the changes were tested:
- [ ] Unit tests pass (`npm test` / `pytest` / etc.)
- [ ] E2E tests pass
- [ ] Manual testing steps described below

**Manual test steps:**
1. ...
2. ...

## Screenshots (if UI changes)
Before / after if applicable.

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No hardcoded secrets or credentials
```

### 5. Present and Refine
Show the generated PR content and ask if the user wants to:
- Use as-is
- Modify any section
- Add more detail

## Principles
- Be concise but complete — reviewers should understand the *why*, not just the *what*
- Highlight breaking changes prominently at the top
- Link related issues and upstream PRs
- If CI is likely to fail, mention it and explain why

## Reference
- Check project's existing PRs for tone and style: `gh pr list --limit 5`
- Look at `CONTRIBUTING.md` for PR guidelines
- [Conventional Commits](https://www.conventionalcommits.org/)
