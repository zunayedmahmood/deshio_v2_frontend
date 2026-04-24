---
name: codebase-audit
description: >
  Conduct a comprehensive technical audit of a full-stack codebase — covering code correctness,
  architectural integrity, and runtime efficiency. Use this skill whenever the user asks to
  "audit the codebase", "review the architecture", "find bugs or anti-patterns", "check for
  issues", "do a code review", "analyze the system for problems", "check type safety",
  "find dead code", "review API contracts", "check for over-fetching or performance issues",
  "evaluate error handling", "look for security gaps", "assess scalability", or similar.
  Also trigger when the user shares source code and says things like "what's wrong with this",
  "is this good practice", "find the issues", "how can I improve this", "is this production-ready",
  "what are the risks here", or "review this for me". Trigger even for casual phrasing —
  if code is present and the user wants an evaluative, critical, or diagnostic analysis, use
  this skill. This is distinct from pure documentation (which only describes): this skill
  identifies problems, inconsistencies, risks, and recommends concrete fixes with justification.
---

# Codebase Audit Skill

You are acting as a **senior software engineer conducting a comprehensive system audit**. Your
role is analytical and evaluative — you identify problems, map risks, and produce concrete
recommendations grounded entirely in observable code and structure. You do NOT fabricate issues,
assume intent, or recommend changes without specific code evidence.

Your output is a structured audit report, not a code review conversation.

---

## Audit Philosophy

- **Evidence-based only**: Every finding must cite a specific file, line range, or function.
  If you cannot point to code, do not make the claim.
- **No invented issues**: If a pattern is used consistently and correctly, say so. Do not flag
  something as an anti-pattern simply because alternatives exist.
- **Severity discipline**: Use a consistent severity scale (defined below). Do not mark
  everything as HIGH — calibrate.
- **Completeness over speed**: A partial audit that misses critical issues is worse than a
  thorough one. Read all layers.
- **Distinguish fact from inference**: If a risk is potential (e.g., "this could cause a
  race condition under load"), label it explicitly as `[POTENTIAL RISK]` vs. a confirmed bug.

---

## Severity Scale

Use this scale consistently across all findings:

| Severity | Label | Definition |
|----------|-------|------------|
| 🔴 Critical | `[CRITICAL]` | Confirmed bug, security vulnerability, data loss risk, or crash path. Must be fixed before production. |
| 🟠 High | `[HIGH]` | Architectural flaw, significant anti-pattern, or performance issue with measurable user impact. |
| 🟡 Medium | `[MEDIUM]` | Code smell, maintainability risk, inconsistency, or redundancy that will compound over time. |
| 🔵 Low | `[LOW]` | Minor style inconsistency, suboptimal pattern, or deviation from best practice with minimal current impact. |
| ℹ️ Info | `[INFO]` | Observation, neutral note, or pattern worth flagging without a recommended change. |

---

## Step 0 — Pre-Flight Codebase Traversal

Before writing a single finding, fully read the codebase. This is non-negotiable.

### 0.1 Enumerate the File Tree

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  -o -name "*.py" -o -name "*.go" -o -name "*.java" -o -name "*.rs" \
  -o -name "*.rb" -o -name "*.cs" \) \
  | grep -v node_modules | grep -v .git | grep -v dist | grep -v build \
  | sort
```

### 0.2 Read All Manifests First

Priority read order:
1. `package.json` / `requirements.txt` / `go.mod` / `Cargo.toml` / `pom.xml`
2. Lock files: `package-lock.json`, `yarn.lock`, `poetry.lock` — check for known vulnerable
   packages if audit scope includes security.
3. `tsconfig.json` — TypeScript strictness settings are critical for type-safety audit.
4. `.eslintrc.*` / `pyproject.toml` / `.flake8` — linting rules define the compliance target.
5. `.env.example` / `config/` — understand configuration surface.
6. `docker-compose.yml` / `Dockerfile` — understand runtime environment.
7. CI/CD configs: `.github/workflows/`, `Jenkinsfile`, `.gitlab-ci.yml`.

### 0.3 Read All Source Files

Do not skip files. Pay specific attention to:
- Entry points (`main`, `index`, `app`, `server`)
- Middleware chains (ordering matters)
- Authentication / authorization logic (security-critical)
- Data access layer (SQL injection, N+1 queries, missing indexes)
- API route handlers (validation, error handling, response shaping)
- State management stores (mutation patterns, selector efficiency)
- Type definition files (`*.d.ts`, `types/`, `interfaces/`)
- Shared utilities (often the source of subtle bugs used everywhere)
- Test files (reveal intended vs. actual behavior gaps)

### 0.4 Build the Mental Model Before Auditing

Before flagging issues, establish:
- What does this system do? (domain)
- What is the request lifecycle? (entry → middleware → handler → service → DB → response)
- Where is the frontend/backend boundary?
- What is the primary data model?
- What external services are integrated?

---

## Step 1 — Output File Setup

```bash
mkdir -p AuditReport/
DATE=$(date +"%d_%b_%Y")
FILENAME="AuditReport/${DATE}_system-audit.md"
echo "Audit report will be saved to: $FILENAME"
```

File naming format: `DD_MMM_YYYY_system-audit.md`
Example: `24_Apr_2026_system-audit.md`

---

## Step 2 — Write the Audit Report

The report must follow this exact section structure. Do not omit sections. If a section has
no findings, write "No issues identified in this domain." — never skip silently.

```
# System Audit Report

## 0. Audit Scope & Methodology
## 1. System Architecture Overview
## 2. Dependency & Data Flow Map
## 3. Static Analysis: Type Safety & Schema Validation
## 4. Dependency Graph & Module Coupling
## 5. Data Flow Analysis
## 6. Control Flow & Request Lifecycle
## 7. API/Interface Contracts
## 8. State Management Patterns
## 9. Integration Points & External Services
## 10. Error Handling & Observability
## 11. Performance & Efficiency
## 12. Security Surface
## 13. Dead Code & Redundancy
## 14. Linting, Formatting & Standards Compliance
## 15. Findings Summary (Prioritized)
## 16. Refactoring Recommendations
## 17. Risk Register
```

---

### Section 0: Audit Scope & Methodology

State explicitly:
- Date of audit
- Files analyzed (count by type: `X .ts files, Y .py files, etc.`)
- Layers covered: Frontend / Backend / Database / Infrastructure / CI-CD
- Layers NOT covered and why (e.g., "No test files present — test coverage not assessed")
- Tools used (static analysis from code reading, bash enumeration, etc.)
- What this audit does NOT include (e.g., runtime profiling, penetration testing, load testing)

---

### Section 1: System Architecture Overview

**Purpose**: Establish the structural baseline that all findings reference against.

Produce:

#### 1.1 Architecture Classification
- Monolith / Monorepo / Microservices / Serverless / Hybrid
- Evidence for classification

#### 1.2 Technology Stack Table

| Layer | Technology | Version | Config File | Notes |
|-------|-----------|---------|-------------|-------|

#### 1.3 Component Interaction Diagram (ASCII or Mermaid)

```
Browser → React SPA → REST API → PostgreSQL
                    → Redis (session cache)
                    → S3 (file uploads)
                    → SendGrid (email)
```

Show every integration point. Mark unknown connections as `[UNRESOLVED]`.

#### 1.4 Architectural Assessment
- Is the architecture internally consistent? (e.g., claims to be REST but uses RPC naming)
- Are layer boundaries respected? (e.g., does the controller contain business logic?)
- Is there a clear separation of concerns?
- Verdict: `SOUND` / `CONCERNS FOUND` / `SIGNIFICANT ISSUES`

---

### Section 2: Dependency & Data Flow Map

**Purpose**: Show how data moves through the system and where modules depend on each other.

#### 2.1 Module Dependency Map
For each major module/service, list its direct dependencies:

```
authController.ts
  → authService.ts
  → jwtService.ts
  → userRepository.ts
  → validationMiddleware.ts
```

Flag:
- `[CIRCULAR]` — circular dependencies
- `[TIGHT COUPLING]` — concrete class imported directly instead of via interface
- `[MISSING ABSTRACTION]` — service directly imports ORM model instead of repository

#### 2.2 Data Flow Summary
Trace the primary data paths end-to-end:

| Flow | Path | Serialization | Validation Points | Risk |
|------|------|--------------|-------------------|------|
| Login | LoginForm → POST /auth/login → authService → usersTable | JSON body | Zod (frontend), Joi (backend) | Schema mismatch risk |

#### 2.3 Cross-Boundary Data Shape Consistency
Compare frontend type definitions against backend response schemas.
Flag mismatches explicitly:

```
[HIGH] Type mismatch: Frontend expects User.createdAt: Date
       Backend returns User.created_at: string (ISO8601)
       File: src/types/user.ts:L14 vs src/serializers/userSerializer.ts:L8
```

---

### Section 3: Static Analysis — Type Safety & Schema Validation

**Purpose**: Assess how well the type system and schema validation protect against runtime errors.

#### 3.1 TypeScript Configuration (if applicable)

Read `tsconfig.json` and report every strictness flag:

| Flag | Value | Risk if Disabled |
|------|-------|-----------------|
| `strict` | `false` | Enables implicit `any`, null unsafety, loose function types |
| `noImplicitAny` | `false` | Variables inferred as `any` silently |
| `strictNullChecks` | `false` | Null/undefined not caught by type checker |
| `noUncheckedIndexedAccess` | missing | Array index access returns `T`, not `T \| undefined` |

For each disabled strict flag, identify files where this creates concrete risk.

#### 3.2 `any` Usage Audit

```bash
grep -rn ": any" src/ --include="*.ts" --include="*.tsx"
grep -rn "as any" src/ --include="*.ts" --include="*.tsx"
```

For each instance, classify:
- `[JUSTIFIED]` — e.g., third-party library interop with no types available
- `[UNJUSTIFIED]` — developer bypassed type checking without reason
- `[RISKY]` — `any` on data flowing across trust boundaries (API responses, user input)

#### 3.3 Runtime Validation Coverage

Map every API endpoint against whether its request body, query params, and response are
validated at runtime (not just typed):

| Endpoint | Request Validation | Validator Library | Response Validated? | Gap |
|----------|--------------------|------------------|---------------------|-----|
| POST /users | ✅ Zod schema | zod@3.21 | ❌ No | Response shape unchecked |
| GET /users/:id | ❌ None | — | ❌ No | [CRITICAL] ID not validated |

#### 3.4 Schema Validation Library Consistency
- Is one validation library used consistently, or are multiple mixed (Joi + Zod + Yup + manual)?
- Are schemas defined once and shared between layers, or duplicated?
- Flag duplicated/diverged schemas explicitly with file citations.

#### 3.5 Python Type Hints (if applicable)
- Are type hints present? Coverage estimate.
- Is `mypy` or `pyright` configured? Strictness level?
- `# type: ignore` usage — enumerate and classify as `[JUSTIFIED]` or `[UNJUSTIFIED]`.

---

### Section 4: Dependency Graph & Module Coupling

**Purpose**: Identify architectural coupling problems that reduce maintainability and testability.

#### 4.1 Coupling Analysis

For each service/module, assess coupling level:

| Module | Coupling Level | Reason | Recommendation |
|--------|---------------|--------|----------------|
| `orderController.ts` | HIGH | Directly instantiates `EmailService`, `StripeService`, `OrderRepository` | Inject dependencies via constructor |
| `authService.ts` | LOW | Receives `UserRepository` via injection | ✅ No action needed |

Coupling levels: `LOW` (injected/interfaced) / `MEDIUM` (imported but swappable) / `HIGH`
(hard-coded instantiation) / `CIRCULAR` (bidirectional dependency).

#### 4.2 Circular Dependency Detection

```bash
# For Node.js projects
npx madge --circular src/

# Manual grep approach
grep -rn "from.*serviceA" src/serviceB.ts
grep -rn "from.*serviceB" src/serviceA.ts
```

List every circular dependency found:
```
[HIGH] Circular: userService.ts → profileService.ts → userService.ts
       userService.ts:L3 imports profileService
       profileService.ts:L7 imports userService
```

#### 4.3 God Objects / God Modules

Flag any module with:
- More than ~300 lines handling multiple unrelated concerns
- More than ~10 direct imports
- Functions that span multiple business domains

```
[MEDIUM] God module: src/utils/helpers.ts (847 lines)
         Mixes: date formatting, string manipulation, API error mapping,
                currency conversion, and authentication helpers.
         Risk: Changes to any utility affect all consumers.
```

#### 4.4 Layer Violation Detection

Check for:
- Controllers containing business logic (should be in services)
- Services directly querying the database (should go through repository)
- UI components making direct fetch calls (should use hooks/services)
- Repository layer containing business rules

For each violation:
```
[HIGH] Layer violation: src/routes/products.ts:L45-L78
       Route handler directly constructs SQL query.
       Should delegate to ProductRepository.
```

---

### Section 5: Data Flow Analysis

**Purpose**: Identify inefficiencies, inconsistencies, and correctness issues in how data
moves through the system.

#### 5.1 Over-Fetching Detection

For each API endpoint or database query, check if the response/query returns more data
than the consumer uses:

```
[MEDIUM] Over-fetching: GET /api/users returns full User object including
         passwordHash, internalNotes, deletedAt.
         Consumer (UserList component) uses only: id, name, email, avatarUrl.
         File: src/routes/users.ts:L23, src/components/UserList.tsx:L12
         Fix: Add a `UserSummaryDTO` projection.
```

#### 5.2 Under-Fetching / N+1 Detection

```
[HIGH] N+1 query: src/services/orderService.ts:getOrdersWithItems()
       Fetches orders list, then for each order fetches items in a loop.
       Pattern:
         const orders = await db.query('SELECT * FROM orders')
         for (const order of orders) {
           order.items = await db.query('SELECT * FROM items WHERE order_id = $1', [order.id])
         }
       Fix: Use JOIN or ORM eager loading.
```

#### 5.3 Serialization / Deserialization Consistency

- Are database snake_case fields consistently converted to camelCase for API responses?
- Are date/time fields returned in a consistent format (ISO8601, Unix timestamp)?
- Are enums serialized consistently (string vs. number)?
- Are nullable fields handled consistently (null vs. undefined vs. omitted)?

Flag every inconsistency with file citations.

#### 5.4 Unnecessary Re-renders (Frontend)

```bash
# Find components without memoization that receive object/array props
grep -rn "React.memo\|useMemo\|useCallback" src/components/
```

Flag components that:
- Receive object/function props but are not memoized
- Have large render trees but no `React.memo` or `shouldComponentUpdate`
- Re-create objects/arrays inline in JSX (new reference each render)

```
[MEDIUM] Unnecessary re-render: src/components/ProductGrid.tsx:L34
         `filters` prop is constructed inline: <ProductGrid filters={{ category, priceRange }} />
         New object reference on every parent render causes ProductGrid to re-render even
         when values haven't changed.
         Fix: useMemo for filters object in parent, or memoize in ProductGrid.
```

#### 5.5 State Propagation Issues

- Props drilled more than 2–3 levels without context/store
- Derived state stored redundantly in multiple places
- Server state duplicated in client state with no sync strategy

---

### Section 6: Control Flow & Request Lifecycle

**Purpose**: Trace the full lifecycle of requests and events, identifying gaps in handling.

#### 6.1 Request Lifecycle Map

For the primary request types (REST, GraphQL, WebSocket), document the complete middleware
chain and flag any gaps:

```
Incoming POST /api/orders:
  1. cors middleware ✅
  2. helmet ✅
  3. express.json (body parser) ✅
  4. rateLimiter ❌ MISSING on this route (present on /api/auth but not /api/orders)
  5. authMiddleware ✅
  6. validateOrderBody ✅
  7. orderController.create
     → orderService.createOrder
     → inventoryService.reserveItems  ⚠️ No rollback if this fails after payment
     → paymentService.charge          🔴 No idempotency key — double-charge risk
     → orderRepository.save
  8. Response serialization ✅
```

#### 6.2 Async Flow Analysis

For every async operation, check:
- Is the promise awaited or is there a floating promise (`.then()` without `catch`)?
- Are `async/await` and `.then()` mixed inconsistently?
- Are parallel operations that could be `Promise.all`'d being run sequentially?

```bash
# Find floating promises (common source of unhandled rejections)
grep -rn "\.then(" src/ --include="*.ts" | grep -v "\.catch\|await"
grep -rn "new Promise" src/ --include="*.ts"
```

```
[HIGH] Floating promise: src/services/notificationService.ts:L67
       sendEmailNotification(user.email, template) — result not awaited,
       error not caught. Failed emails fail silently.
```

#### 6.3 Transaction Boundaries

For operations that span multiple DB writes, check:
- Are they wrapped in a database transaction?
- If one step fails, is the partial state rolled back?

```
[CRITICAL] Missing transaction: src/services/paymentService.ts:processCheckout()
           Steps: createOrder() → deductInventory() → chargePayment()
           If chargePayment() throws after deductInventory() succeeds,
           inventory is decremented but no order exists and no payment taken.
           Fix: Wrap all three in a DB transaction; use saga pattern for
           external payment call.
```

#### 6.4 Event Handler Analysis

For event-driven systems, frontend event handlers, or message queue consumers:
- Are handlers idempotent?
- Is there a dead-letter queue or error handling for failed messages?
- Are event listeners cleaned up (removed on component unmount, consumer shutdown)?

```
[MEDIUM] Memory leak: src/components/NotificationBell.tsx:L23
         addEventListener('message', handler) added on mount with no
         removeEventListener in cleanup. Multiplies on re-mount.
```

---

### Section 7: API / Interface Contracts

**Purpose**: Verify that API contracts are well-defined, consistent, versioned, and honored.

#### 7.1 Endpoint Audit Table

For every endpoint, assess:

| Endpoint | Auth | Input Validated | Output Typed | Error Shape Consistent | Versioned | Issues |
|----------|------|----------------|--------------|----------------------|-----------|--------|
| POST /auth/login | No | ✅ Zod | ✅ | ✅ | ❌ | None |
| GET /users | JWT | ❌ | ✅ | ❌ | ❌ | [HIGH] No pagination validation |
| DELETE /users/:id | JWT | ❌ ID validation | ⚠️ Only 204 | ✅ | ❌ | [HIGH] UUID not validated |

#### 7.2 Error Response Consistency

Enumerate all error response shapes found in the codebase and flag inconsistencies:

```
[MEDIUM] Inconsistent error shapes:
  authController.ts returns:    { "message": "string" }
  userController.ts returns:    { "error": "string", "code": number }
  validationMiddleware returns: { "errors": [{ "field": string, "message": string }] }
  
  Clients must handle 3 different error shapes. No shared error factory.
```

#### 7.3 API Versioning

- Is there a versioning strategy (`/api/v1/`, headers, etc.)?
- If no versioning: flag as `[INFO]` for greenfield, `[HIGH]` for systems with external consumers.

#### 7.4 REST Correctness

Check for common REST violations:

| Violation | Example | Severity |
|-----------|---------|----------|
| RPC-style naming | `POST /api/getUser` | LOW |
| Wrong HTTP method for action | `GET /api/deleteUser/:id` | HIGH |
| Missing idempotency on PUT | PUT changes different data per call | HIGH |
| 200 returned on error | `{ success: false }` with status 200 | MEDIUM |
| Sensitive data in URL params | `GET /reset?token=abc123` | HIGH |

#### 7.5 GraphQL Schema (if applicable)

- Are all resolvers protected by auth directives or middleware?
- Is there query depth limiting? (DoS risk)
- Are N+1 queries mitigated with DataLoader?
- Are mutations idempotent?

---

### Section 8: State Management Patterns

**Purpose**: Assess correctness and efficiency of client and server state management.

#### 8.1 State Architecture Assessment

| State Type | Solution Used | Appropriate? | Issues |
|------------|--------------|-------------|--------|
| Server cache | React Query v5 | ✅ | Stale time not configured |
| UI state | useState | ✅ | — |
| Form state | Manual useState | ⚠️ | Complex forms; consider react-hook-form |
| Auth state | Context API | ⚠️ | Triggers full subtree re-render on token refresh |
| URL state | None | ❌ | Filters not in URL — not shareable/bookmarkable |

#### 8.2 Store Mutation Analysis

For Redux/Zustand/Pinia stores, check:
- Are mutations happening outside of store actions (direct state mutation)?
- Is derived state computed via selectors or stored redundantly?
- Are selectors memoized?

```
[MEDIUM] Direct mutation outside store:
         src/components/CartDrawer.tsx:L88
         cartStore.state.items.push(newItem) — mutates store state directly.
         Should call cartStore.addItem(newItem) action.
```

#### 8.3 Client/Server State Synchronization

- On mutation (create/update/delete), is the client cache invalidated or updated?
- Are optimistic updates implemented? If so, is rollback handled on failure?
- Is there a stale-while-revalidate or polling strategy for real-time data?

```
[HIGH] Cache not invalidated: src/hooks/useCreatePost.ts
       After successful POST /api/posts, the posts list cache is not invalidated.
       User sees stale list until page refresh.
       Fix: queryClient.invalidateQueries(['posts']) in onSuccess.
```

#### 8.4 Normalization

- Is relational data normalized in the store, or is the same entity duplicated
  across multiple cache keys?

```
[MEDIUM] Denormalized cache: User object appears in:
         - queryCache['users'] list
         - queryCache['users/:id'] detail
         - queryCache['posts'] (embedded in each post's author field)
         An update to user's name requires 3 cache invalidations.
         Fix: Normalize with a user entity cache and references.
```

---

### Section 9: Integration Points & External Services

**Purpose**: Assess the correctness and resilience of all external integrations.

For each external service, produce an integration assessment:

```
### Integration: Stripe (Payment Processing)

- **Library**: stripe@13.2.0
- **Auth**: Secret key from env (STRIPE_SECRET_KEY) ✅
- **Used in**: src/services/paymentService.ts

Findings:
[CRITICAL] No idempotency keys on charge creation (stripe.charges.create).
           Retries on network timeout will double-charge.
           Fix: Pass idempotencyKey: `order-${orderId}` in request options.

[HIGH] Webhook endpoint /api/webhooks/stripe does not verify Stripe signature.
       Any HTTP POST to this endpoint will be processed as a real event.
       Fix: Use stripe.webhooks.constructEvent() with STRIPE_WEBHOOK_SECRET.

[MEDIUM] No retry logic on Stripe API calls.
         Transient failures propagate as 500s to users.
         Fix: Wrap in retry-with-exponential-backoff utility.
```

Standard checks for every integration:
- API key stored in env, not hardcoded? (`grep -rn "sk_live_\|api_key =" src/`)
- Error responses handled specifically (not caught with generic `catch`)?
- Timeouts configured?
- Retry logic present?
- Webhooks verified (signature check)?
- SDK version pinned and up to date?

---

### Section 10: Error Handling & Observability

**Purpose**: Assess how errors are caught, surfaced, logged, and monitored.

#### 10.1 Error Handling Coverage Map

| Layer | Errors Caught? | Method | Logging? | User-Facing Message Sanitized? |
|-------|---------------|--------|----------|-------------------------------|
| Express global | ✅ | errorMiddleware | ✅ Winston | ✅ |
| Service layer | ⚠️ Partial | try/catch in some services | ❌ | N/A |
| Repository layer | ❌ | None | ❌ | N/A |
| Frontend API calls | ⚠️ | Some hooks have catch, some don't | ❌ | ⚠️ Raw error messages shown |

#### 10.2 Error Taxonomy

- Are custom error classes defined and used consistently?
- Do errors carry enough context (operation name, entity ID, correlation ID)?
- Are errors re-thrown after logging, or swallowed?

```
[HIGH] Swallowed error: src/services/emailService.ts:L34
       try { await sendgrid.send(msg) } catch (e) { console.log(e) }
       Email failure is logged but not re-thrown. Caller assumes success.
       Callers do not check return value. Failed emails are invisible.
```

#### 10.3 Logging Assessment

| Dimension | Finding | Severity |
|-----------|---------|----------|
| Log levels used correctly | WARN used for INFO events | LOW |
| Sensitive data in logs | `console.log(user)` includes passwordHash | CRITICAL |
| Structured logging | Mix of `console.log` and Winston JSON | MEDIUM |
| Correlation IDs | Not present — can't trace a request across logs | HIGH |
| Production log level | Not configurable via env | MEDIUM |

#### 10.4 Observability Gaps

- Is there a health check endpoint (`/health`, `/ping`)?
- Is there metrics collection (Prometheus, Datadog, etc.)?
- Is there distributed tracing (OpenTelemetry, Jaeger)?
- Are errors reported to an error tracking service (Sentry, Bugsnag)?

Flag each missing element with its operational impact.

---

### Section 11: Performance & Efficiency

**Purpose**: Identify concrete performance bottlenecks and inefficiency patterns.

#### 11.1 Database Query Efficiency

For every database interaction, check:

| Query Location | Pattern | Issue | Severity |
|---------------|---------|-------|----------|
| `orderService.ts:L45` | `SELECT *` on large table | Fetches all columns | MEDIUM |
| `userService.ts:L89` | N+1 in loop | See Section 5.2 | HIGH |
| `productService.ts:L23` | Full table scan, no LIMIT | DoS risk | HIGH |
| `reportService.ts:L67` | Synchronous heavy aggregation | Blocks event loop (Node.js) | HIGH |

Check for:
- Missing `LIMIT` on list queries
- `SELECT *` where specific columns suffice
- Queries inside loops
- Missing index on foreign keys and filtered columns (infer from schema definitions)
- Missing pagination on endpoints that return collections

#### 11.2 Caching Strategy Assessment

- What is cached? (list all cache usages)
- What should be cached but isn't?
- Are cache keys deterministic and collision-free?
- Is cache invalidation correct? (hardest problem)
- TTL values — are they appropriate for the data's change frequency?

#### 11.3 Bundle Size & Load Performance (Frontend)

```bash
# Check for heavy dependencies
cat package.json | grep -E "moment|lodash|@mui|antd" 
# These are known large packages; flag if lighter alternatives exist
```

- Is code splitting configured? (`React.lazy`, dynamic `import()`)
- Are large libraries imported in full vs. tree-shaken?
- Are images optimized?
- Is there a CDN configured for static assets?

#### 11.4 Concurrency & Blocking

For Node.js backends:
- Are CPU-heavy tasks (image processing, PDF generation, heavy computation) offloaded from
  the main event loop?
- Are there `fs.readFileSync` or `execSync` calls in request handlers?

```
[HIGH] Synchronous file I/O in request handler:
       src/controllers/exportController.ts:L34
       fs.readFileSync(templatePath) blocks the event loop.
       Fix: Use fs.promises.readFile() or cache the template at startup.
```

---

### Section 12: Security Surface

**Purpose**: Identify security vulnerabilities and gaps observable from static code analysis.

> Note: This is a static analysis audit, not a penetration test. Runtime exploitation is out
> of scope. Flag what is observable in code.

#### 12.1 Authentication & Authorization

| Check | Status | Location | Severity |
|-------|--------|----------|----------|
| JWT secret in env (not hardcoded) | ✅ | .env | — |
| JWT expiry set | ✅ 15m | jwtService.ts:L12 | — |
| JWT refresh token rotation | ❌ Missing | — | HIGH |
| All protected routes have auth middleware | ⚠️ | routes/admin.ts:L45 missing | CRITICAL |
| Role check on sensitive operations | ❌ | userController.ts:deleteUser | CRITICAL |

#### 12.2 Input Validation & Injection

```bash
# Check for raw SQL string interpolation
grep -rn "SELECT.*\${" src/ --include="*.ts"
grep -rn "query\(.*+" src/ --include="*.ts"
grep -rn "eval\(" src/ --include="*.ts" --include="*.js"
```

| Issue | Location | Severity |
|-------|----------|----------|
| SQL injection via string interpolation | `db.ts:L67` | CRITICAL |
| `eval()` on user-supplied data | `parser.ts:L23` | CRITICAL |
| Missing HTML sanitization on user content | `commentRenderer.tsx:L12` | HIGH |
| Path traversal in file download | `fileController.ts:L89` | CRITICAL |

#### 12.3 Secrets & Configuration

```bash
grep -rn "password\|secret\|api_key\|token" src/ --include="*.ts" \
  | grep -v ".env" | grep -v "process.env" | grep -v "//.*comment"
```

Flag any hardcoded secrets immediately as `[CRITICAL]`.

#### 12.4 HTTP Security Headers

Check `helmet` or equivalent configuration:
- `Content-Security-Policy` configured?
- `X-Frame-Options` set?
- `HSTS` enabled for production?
- CORS `origin` restricted (not `*`) in production?

#### 12.5 Dependency Vulnerabilities

```bash
npm audit --audit-level=high
# or
pip-audit
# or
cargo audit
```

Report HIGH and CRITICAL CVEs with package name, version, CVE ID, and fix version.

---

### Section 13: Dead Code & Redundancy

**Purpose**: Identify code that is unused, duplicated, or logically unreachable.

#### 13.1 Unused Exports

```bash
npx ts-prune src/   # TypeScript: finds exported symbols with no external consumers
```

List every unused export with file and line.

#### 13.2 Unreachable Code

Flag:
- Code after `return` / `throw` statements
- Conditions that are always true or always false
- Switch `case` blocks that can never be reached

```
[MEDIUM] Unreachable code: src/utils/priceCalculator.ts:L45-L52
         Code block follows an unconditional `return` on L44.
```

#### 13.3 Duplicate Logic

```bash
# Find similar function names that may be duplicates
grep -rn "function format\|const format\|formatDate\|formatCurrency" src/
```

Flag functions or modules that perform the same operation in different places.

```
[MEDIUM] Duplicate logic: Date formatting implemented independently in:
         - src/utils/dateUtils.ts:formatDate()
         - src/components/EventCard.tsx:L34 (inline)
         - src/services/reportService.ts:L89 (inline)
         Three implementations, potentially with different behaviors.
```

#### 13.4 Feature Flag / Commented Code

- Flag `TODO`, `FIXME`, `HACK` comments (enumerate and assess age/risk)
- Flag large blocks of commented-out code
- Flag unused environment variables in `.env.example`

---

### Section 14: Linting, Formatting & Standards Compliance

**Purpose**: Assess whether the codebase enforces and follows its own stated conventions.

#### 14.1 Linting Configuration

Read `.eslintrc.*` / `pyproject.toml` / `.golangci.yml` and report:
- Rules enabled
- Rules disabled (and whether suppressions are justified)
- Rules that are configured but violated in practice

```bash
npx eslint src/ --format=json 2>/dev/null | python3 -c "
import json,sys
data=json.load(sys.stdin)
errors=[(f['filePath'], m['message'], m['severity']) for f in data for m in f['messages']]
print(f'Total issues: {len(errors)}')
for path,msg,sev in errors[:20]: print(f'  [{\"ERROR\" if sev==2 else \"WARN\"}] {path}: {msg}')
"
```

Report:
- Total error count
- Total warning count
- Most frequent rule violations (top 5)

#### 14.2 Formatting Consistency

```bash
npx prettier --check src/ 2>&1 | tail -5
```

- Is Prettier / Black / gofmt enforced?
- Are there files that differ from the formatter's output?

#### 14.3 Naming Convention Consistency

| Convention | Expected | Violations Found | Severity |
|------------|----------|-----------------|----------|
| React components | PascalCase | `userCard.tsx` | LOW |
| API routes | kebab-case | `/getUser` | LOW |
| DB columns | snake_case | `userId` in users table | MEDIUM |
| TS interfaces | PascalCase, `I` prefix optional | Mixed `IUser` and `User` | LOW |

---

### Section 15: Findings Summary (Prioritized)

**Purpose**: A single consolidated, prioritized list of all findings.

Sort by severity (CRITICAL first), then by impact.

| # | Severity | Domain | Finding | File(s) | Effort to Fix |
|---|----------|--------|---------|---------|---------------|
| 1 | 🔴 CRITICAL | Security | Missing auth middleware on /admin routes | routes/admin.ts:L45 | Low (add middleware) |
| 2 | 🔴 CRITICAL | Security | SQL injection via string interpolation | db.ts:L67 | Medium (parameterize queries) |
| 3 | 🔴 CRITICAL | Data integrity | Missing transaction on checkout flow | paymentService.ts | High (refactor to saga) |
| 4 | 🟠 HIGH | Performance | N+1 query in order listing | orderService.ts:L89 | Medium (add JOIN) |
| ... | | | | | |

**Summary Counts**:
- 🔴 Critical: N
- 🟠 High: N
- 🟡 Medium: N
- 🔵 Low: N
- ℹ️ Info: N
- **Total**: N

---

### Section 16: Refactoring Recommendations

**Purpose**: Concrete, prioritized, technically justified fixes for the most impactful findings.

For each recommendation, use this format:

```
### REC-01: Add Transaction Boundary to Checkout Flow

**Addresses**: Finding #3 (CRITICAL — data integrity)
**Files**: src/services/paymentService.ts, src/repositories/orderRepository.ts

**Problem**:
The checkout flow performs three sequential side effects — createOrder(), deductInventory(),
and chargePayment() — without a database transaction. A failure at step 3 leaves the system
in an inconsistent state: inventory decremented, order created, but no payment taken.

**Technical Justification**:
External payment APIs (Stripe) cannot be part of a DB transaction. The appropriate pattern
is the Saga / outbox pattern: perform DB writes atomically, then publish an event for the
payment step, with compensating transactions on failure.

**Recommended Fix**:
1. Wrap createOrder() + deductInventory() in a single DB transaction.
2. On transaction commit, publish an OrderCreated event to a queue.
3. A payment worker processes the event, calls Stripe, and on success publishes OrderPaid.
4. On payment failure, publish a compensating DecrementInventoryRollback event.

**Estimated Effort**: 3–5 days
**Risk of Not Fixing**: Double inventory decrement or inventory loss without payment on
  any network interruption during checkout.
**Impact if Fixed**: Eliminates data inconsistency class of bugs in checkout.
```

Produce one `REC-XX` block per CRITICAL or HIGH finding. Group related MEDIUM findings
into a single recommendation if they share a fix pattern.

---

### Section 17: Risk Register

**Purpose**: Forward-looking risk assessment based on audit findings.

| Risk ID | Risk Description | Likelihood | Impact | Current Controls | Recommended Control |
|---------|-----------------|------------|--------|-----------------|---------------------|
| R-01 | Checkout produces inconsistent state under network failure | Medium | High (revenue loss) | None | Saga pattern (REC-01) |
| R-02 | Admin routes accessible without authentication | High (any user can attempt) | Critical | None | Auth middleware (REC-02) |
| R-03 | Stripe double-charge on retry | Low | High (customer trust) | None | Idempotency keys (REC-04) |
| R-04 | Scaling: no DB connection pooling config | Low now, High at 10x load | Medium | None | Configure pg pool |

---

## Step 3 — Quality Gate Before Saving

Before saving, verify:

- [ ] All 17 sections (0–16) present
- [ ] Every finding has a file citation
- [ ] Every CRITICAL and HIGH finding has a corresponding REC-XX in Section 16
- [ ] Severity labels are used from the defined scale only
- [ ] Section 15 counts match the total findings in the document
- [ ] File is named `DD_MMM_YYYY_system-audit.md`
- [ ] File is in `AuditReport/` directory
- [ ] No invented findings (every claim traceable to code)

---

## Step 4 — Save, Present, and Summarize

```bash
wc -l "$FILENAME"
echo "Audit report saved: $FILENAME"
```

Present the file using `present_files` if available.

Report to the user:
- Total findings by severity
- Top 3 most critical issues (one-sentence each)
- Estimated fix effort for CRITICAL items
- Number of `[UNRESOLVED]` items requiring follow-up

---

## Behavioral Constraints (Non-Negotiable)

1. **Evidence-only**: No finding without a file:line citation
2. **No fabrication**: Do not flag an issue you did not observe in code
3. **Calibrated severity**: Not everything is CRITICAL. Reserve it for genuine bugs and security holes
4. **No style opinions without a rule**: Only flag formatting/naming if a config file defines the rule
5. **Separate fact from risk**: Label `[CONFIRMED BUG]` vs `[POTENTIAL RISK]` precisely
6. **Cover all layers**: Frontend, backend, DB layer, config, and CI/CD — all in scope
7. **Include positives**: Note what is done well (e.g., "Auth layer uses injection correctly")
8. **No recommendations without justification**: Every REC-XX must explain *why*, not just *what*

---

## Handling Specific Tech Stacks

### Next.js / React
- Check: Server Components vs Client Components boundary — data fetching in client components
- Check: `getServerSideProps` vs `getStaticProps` appropriateness
- Check: API routes — are they behind middleware? Do they validate?
- Check: `use client` directives — is client bundle size justified?

### Django / FastAPI / Flask
- Check: `DEBUG=True` in production config
- Check: CSRF protection on mutation endpoints
- Check: QuerySet `.all()` without `.select_related()` / `.prefetch_related()`
- Check: Serializer `validated_data` used (not raw `request.data`)
- Check: `SECRET_KEY` from environment
- FastAPI: Are `Depends()` injection patterns used consistently?

### PostgreSQL / MySQL
- Check: Migrations — are there any schema changes without migrations?
- Check: Indexes on foreign keys and commonly filtered columns
- Check: `ON DELETE CASCADE` vs. `SET NULL` — appropriate for the domain?
- Check: Transactions for multi-table writes

### Redis
- Check: TTL set on all keys? (unbounded growth risk)
- Check: Key naming conventions consistent?
- Check: Is Redis used as primary store anywhere? (data loss risk on eviction)

### Docker / Kubernetes
- Check: Running as root in container?
- Check: Secrets mounted as files vs. env vars?
- Check: Resource limits defined?
- Check: Health checks defined in Dockerfile/deployment?

---

## Language-Specific Analysis Commands

```bash
# TypeScript: find any usage
grep -rn ": any\|as any\| any;" src/ --include="*.ts" --include="*.tsx"

# TypeScript: find non-null assertions (potential NPE)
grep -rn "!\." src/ --include="*.ts" --include="*.tsx" | grep -v "!=="

# Python: find bare excepts (swallowed errors)
grep -rn "except:" src/ --include="*.py"

# Python: find TODO/FIXME/HACK
grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.py" --include="*.ts"

# All: find hardcoded secrets pattern
grep -rn "password\s*=\s*['\"].\|api_key\s*=\s*['\"].\|secret\s*=\s*['\"]." src/

# All: find console.log left in production code
grep -rn "console\.log\|print(" src/ --include="*.ts" --include="*.tsx" --include="*.py" \
  | grep -v "logger\|test\|spec"

# Find large files that may be god modules
find src/ -name "*.ts" -o -name "*.py" | xargs wc -l | sort -rn | head -20
```

---

*This skill produces an evidence-based, prioritized audit report. Every finding is traceable
to observable code. The output is an actionable engineering document, not an opinion.*