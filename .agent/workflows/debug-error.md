---
description: Analyze error messages and stack traces to identify root cause and fix
---

# Debug Error

I will help you analyze errors and stack traces, identify the root cause, and suggest targeted fixes that match the project's existing patterns.

## Guardrails
- Focus on the actual error, not just surface symptoms
- Check the most common causes before deep investigation
- Suggest fixes that match the project's patterns and conventions
- Never modify code without showing the diff and getting user confirmation
- If multiple fixes are plausible, rank them by likelihood

## Steps

### 1. Gather Error Information
Collect everything available:
- Full error message (copy-paste, not paraphrase)
- Full stack trace
- What action triggered the error (user action / API call / background job)
- Is this a new error or a regression?
- Can it be reproduced consistently? Or is it intermittent?
- Environment: local / staging / production? After a recent deploy?

### 2. Parse the Error
Extract structured information:

**From the error message:**
- Error type (TypeError, SyntaxError, NetworkError, ImportError, etc.)
- Error description (the human-readable part)
- File and line number if present

**From the stack trace:**
- Entry point of the failure
- Call sequence leading to the error
- Which frames are internal code vs external libraries
- The first internal frame is usually the most actionable

### 3. Identify Common Causes by Error Type

| Error Type | Common Causes |
|------------|---------------|
| `TypeError` | Null/undefined access, calling non-function, wrong argument type |
| `ReferenceError` | Undefined variable, scope issue, wrong import |
| `SyntaxError` | Typos, missing brackets/quotes, invalid syntax |
| `NetworkError / fetch failed` | API down, CORS misconfiguration, wrong URL, bad auth |
| `ModuleNotFoundError` | Missing dependency, wrong import path, circular import |
| `ValueError / ValidationError` | Unexpected input shape, schema mismatch |
| `PermissionError` | File system access, OS permissions, auth scope |
| `TimeoutError` | Slow query, unresponsive service, deadline exceeded |
| `OutOfMemory` | Memory leak, large dataset, infinite loop |

### 4. Investigate the Code
Navigate to the relevant code:
- Open the file and line mentioned in the stack trace
- Read surrounding context (±20 lines)
- Check recent changes if it's a regression: `git log -p --follow <file> | head -100`
- Search for similar patterns: `rg "<error-pattern>" --type <lang>`

### 5. Form a Hypothesis
Before fixing, state clearly:
- What is the root cause?
- Why does it happen in this specific path?
- What is the minimal change that fixes it without side effects?

### 6. Suggest Fixes
Provide ranked solutions:

For each fix:
1. Explain what's wrong
2. Show the problematic code snippet
3. Show the fixed code
4. Explain why this fix is correct and doesn't break anything else

Prefer minimal, surgical fixes over large refactors unless the error reveals a deeper design issue.

### 7. Verify
After applying a fix:
- Run the code or test again
- Confirm the original error is gone
- Check for new errors introduced by the fix
- Run the relevant test suite if available

## Principles
- **Read the error message carefully** — it usually tells you exactly what's wrong
- **Check the most recent commit first** for regressions: `git log --oneline -5`
- **Consider edge cases** (null, empty string, 0, undefined, empty array)
- **Look for typos** in variable/function/import names — they cause 30% of errors
- **Don't fix symptoms** — trace back to the root cause

## Reference
- Search codebase for similar patterns: `rg "<symbol>" --type <lang>`
- Check documentation for the library/API involved
- Look at recent commits for regressions: `git log --since="2 days ago" --oneline`
- Check open issues for known bugs: `gh issue list --search "<error text>"`
