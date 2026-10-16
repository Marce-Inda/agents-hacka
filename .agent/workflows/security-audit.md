---
description: Scan code for vulnerabilities, exposed secrets, and security issues
---

# Security Audit

I will help you scan the codebase for security vulnerabilities, exposed secrets, and violations of security best practices — with actionable fix suggestions for each finding.

## Guardrails
- Never print or expose found secrets in output — mask them (e.g. `sk-***...***`)
- Verify before alerting — check for false positives
- Prioritize by severity: Critical → High → Medium → Low
- Suggest fixes, not just problems
- Don't modify code without user confirmation

## Steps

### 1. Define Scope
Ask clarifying questions:
- Full codebase or specific files/directories/PRs?
- Any known areas of concern?
- Application type: web API / frontend / CLI / background worker / library?
- Are there existing security tools configured? (e.g., Snyk, Gitleaks, Semgrep, Bandit)
- Is this a pre-commit check, pre-deploy audit, or incident response?

### 2. Check for Exposed Secrets
Search for patterns that indicate hardcoded credentials:

**Common patterns to grep:**
```bash
rg -i "(api_key|apikey|secret|password|passwd|token|bearer|private.?key|access.?key)" \
   --glob "!*.lock" --glob "!node_modules/**" -l
```

**High-risk files to inspect manually:**
- `.env` files (should be gitignored — verify with `git check-ignore .env`)
- `config/` directories
- Test files with real-looking credentials
- Docker/CI config files with inline secrets

**Check git history for secrets (they persist even if removed):**
```bash
git log --all --full-history -p -- "*.env" | head -200
```

### 3. Review Authentication & Authorization
Check for common auth issues:
- [ ] Hardcoded credentials or default passwords
- [ ] Missing authentication on routes (check all public endpoints)
- [ ] Improper session handling (session fixation, missing expiry)
- [ ] Weak password requirements (< 8 chars, no complexity)
- [ ] Missing CSRF protection on state-changing endpoints
- [ ] JWT: algorithm set to `none`, weak secret, missing expiry
- [ ] Missing rate limiting on auth endpoints

### 4. Check Input Validation
Look for injection vulnerabilities:
- [ ] **SQL injection** — unparameterized queries (`string interpolation + SQL`)
- [ ] **XSS** — unsanitized user input rendered as HTML
- [ ] **Command injection** — shell commands built with user input
- [ ] **Path traversal** — file paths constructed from user input (`../` sequences)
- [ ] **SSRF** — user-controlled URLs used in server-side fetch calls
- [ ] **Mass assignment** — object spread with unfiltered user input

### 5. Review Dependencies
Check for vulnerable packages:

// turbo
```bash
# Node.js
npm audit --audit-level=moderate

# Python
pip-audit  # or: safety check

# Go
govulncheck ./...

# Ruby
bundle audit
```

### 6. Review Security Headers & Configuration
For web applications:
- [ ] `Content-Security-Policy` header present
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` (or CSP `frame-ancestors`)
- [ ] `Strict-Transport-Security` (HSTS) for HTTPS
- [ ] `Referrer-Policy` set
- [ ] `CORS` configured restrictively (not `*` for credentialed requests)
- [ ] Sensitive data not logged (passwords, tokens, PII)

### 7. Generate Report
Summarize all findings in a severity table:

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| Critical | Exposed API key | `config.js:15` | Move to env var, rotate key |
| High | SQL injection | `api/users.js:42` | Use parameterized queries |
| Medium | No rate limit on `/login` | `routes/auth.js` | Add rate limiter middleware |
| Low | Outdated lodash (no CVE) | `package.json` | Update to latest |

### 8. Suggest Fixes
For each Critical and High finding:
- Explain the vulnerability and attack scenario
- Show the vulnerable code
- Show the fixed code
- Link to documentation (OWASP, CWE, CVE)

## Severity Guidelines

| Severity | Criteria |
|----------|----------|
| **Critical** | Exposed secrets, RCE, SQL injection, broken auth |
| **High** | Auth bypass, stored XSS, sensitive data exposure, IDOR |
| **Medium** | CSRF, missing security headers, reflected XSS, weak config |
| **Low** | Info disclosure, outdated deps (no CVE), verbose errors |

## Principles
- Assume all user input is malicious until validated and sanitized
- Never trust client-side validation alone — validate on the server
- Keep secrets out of code — use environment variables or a secrets manager
- Use parameterized queries — always
- Sanitize output, not just input
- Principle of least privilege — request only necessary permissions

## Reference
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- `npm audit` / `pip-audit` / `govulncheck`
- [CWE Top 25](https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html)
- Search for known patterns: `rg "eval\(|exec\(|shell_exec\|subprocess.call" --type <lang>`
