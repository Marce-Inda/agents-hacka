---
description: Add strategic logging and debugging statements to trace issues
---

# Debug Logging

I will help you add targeted, strategic logging to trace issues — without flooding logs with noise, and without leaving debugging artifacts in production code.

## Guardrails
- Detect the project's existing logging framework before adding new ones
- Don't log sensitive data (passwords, tokens, PII, credit card numbers)
- Use appropriate log levels — don't make everything `debug` or `error`
- Mark temporary debugging logs clearly so they can be removed later
- Follow the project's log formatting conventions

## Steps

### 1. Understand the Goal
Ask clarifying questions:
- What specific behavior are you trying to trace? (data flow / timing / conditional branch / async race)
- Is this for local debugging (temp) or permanent observability (keep in code)?
- Is there an error already occurring, or are you proactively investigating?
- What part of the code path is under suspicion?

### 2. Detect Existing Logging Setup
Check what logging infrastructure already exists:

**JavaScript / Node.js:**
```bash
rg "winston|pino|bunyan|morgan|console\.log|logger\." --type js --type ts -l | head -10
```

**Python:**
```bash
rg "import logging|from logging|loguru|structlog" --type py -l | head -10
```

**Go:**
```bash
rg "log\.|zap\.|logrus\." --type go -l | head -10
```

If no logger exists, use the language's standard approach — don't introduce a heavy dependency for temporary debugging.

### 3. Identify Strategic Log Points
Determine where logs will have the highest signal-to-noise:

| Scenario | Where to Log |
|----------|-------------|
| Data transformation | Input + output of the transform function |
| Conditional branch | Which branch was taken and why (the condition value) |
| External call | Request payload + response status + latency |
| Async/concurrent | Start, completion, and any await points |
| Loop | First iteration, last iteration, count |
| Error path | The error object + the context that led to it |

### 4. Write the Log Statements

**Log levels guide:**
- `error` — unrecoverable failure, needs immediate attention
- `warn` — degraded state, recoverable, should be investigated
- `info` — significant business events (user logged in, job started/completed)
- `debug` — detailed flow for troubleshooting (can be verbose)
- `trace` — every step, for deep debugging only

**What to include in each log:**
- **What** happened (event name or action)
- **Where** it happened (function name or module — often from the logger context)
- **Relevant values** (IDs, counts, key fields — not entire objects blindly)
- **Correlation ID / request ID** if available (for tracing across services)

**Example patterns by language:**

*Node.js (console or pino):*
```js
// Temporary debug — mark for removal
console.debug('[DEBUG][UserService.getById]', { userId, result: user?.id ?? 'NOT FOUND' });

// Permanent structured log
logger.info({ event: 'user.fetched', userId, durationMs }, 'User fetched successfully');
```

*Python:*
```python
# Temporary
logging.debug(f"[DEBUG][process_payment] amount={amount}, currency={currency}")

# Permanent
logger.info("payment.processed", extra={"amount": amount, "currency": currency, "user_id": user_id})
```

### 5. Add Timing Logs (for performance issues)
```js
// Node.js
const start = Date.now();
// ... operation ...
logger.debug({ event: 'db.query', durationMs: Date.now() - start, query: 'getUserById' });
```

```python
import time
start = time.perf_counter()
# ... operation ...
logger.debug("db.query", extra={"duration_ms": (time.perf_counter() - start) * 1000})
```

### 6. Test the Logs
Run the relevant code path and verify:
- Logs appear at the expected level
- Values are correct and readable
- No sensitive data is leaked
- Log volume is reasonable (not thousands per request)

### 7. Clean Up (if temporary)
If the logs were added for temporary debugging:
- Mark them with `// TODO: remove debug log` before committing
- Or use a feature flag / `DEBUG=true` env var to conditionally enable them
- Remove before the PR is merged (or document explicitly if keeping)

## Principles
- **Strategic over saturating** — 3 well-placed logs beat 30 noisy ones
- **Never log secrets** — mask sensitive fields: `{ token: '***' }`
- **Structured over string-concatenated** — `logger.info({ userId })` beats `logger.info("user: " + userId)`
- **Correlate** — include a request/trace ID whenever possible
- **Temporary logs are technical debt** — clean them up

## Reference
- Check existing log usage: `rg "logger\.(info|debug|error|warn)" --type <lang> | head -20`
- View logs in dev: `npm run dev 2>&1 | grep DEBUG`
- [12-Factor App: Logs](https://12factor.net/logs)
