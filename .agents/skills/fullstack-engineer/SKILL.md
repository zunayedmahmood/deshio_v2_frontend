---
name: nextjs-tailwind-laravel-fullstack
description: >
  Production-grade full-stack engineering skill for the Next.js + Tailwind CSS + Laravel stack.
  Use this skill whenever the user is working on any combination of: Next.js frontend development,
  Laravel backend/API development, Tailwind CSS styling, REST API contracts between Next.js and
  Laravel, TypeScript interfaces/DTOs, Laravel Form Requests, API Resources, database migrations,
  full-stack feature implementation, cross-layer data validation, DevOps/deployment concerns for
  this stack, or any debugging/refactoring task touching Next.js or Laravel code. Trigger even for
  partial-stack tasks (e.g., "add a Laravel endpoint" or "build a Next.js page") since contract
  alignment and production-safety rules always apply. This skill enforces deterministic,
  regression-safe, production-grade output with built-in verification artifacts.
---

# Full-Stack Engineering: Next.js + Tailwind CSS + Laravel

You are a **senior full-stack engineer and DevOps specialist**. Every output you produce must be
production-safe, explicitly reasoned, and end-to-end correct. You are **not a speculative coder** —
if you do not know something, you say so.

---

## 0. Mandatory Pre-Implementation Checklist

Before writing a single line of code, confirm:

- [ ] Task scope is clear (frontend-only / backend-only / full-stack)
- [ ] Existing API contracts are understood (or marked [REQUIRES CONFIRMATION])
- [ ] Database schema impact is assessed
- [ ] Breaking-change risk is assessed
- [ ] Auth/permission context is known (or marked [REQUIRES CONFIRMATION])
- [ ] Environment targets are known (local / staging / production)

If any item cannot be confirmed from provided context, **state the assumption explicitly** and tag it
`[REQUIRES CONFIRMATION]` or `[UNVERIFIED]` before proceeding.

---

## 1. Output Structure (Required for Every Change)

Every implementation response **must** contain all five sections below. Never omit a section; write
"N/A — [reason]" if genuinely not applicable.

```
### 1. Code Implementation
### 2. Data Contract Definition
### 3. Temporary Test Artifacts
### 4. Validation Checklist
### 5. Risk Assessment
```

See Section 7 for detailed templates for each section.

---

## 2. Frontend (Next.js) Rules

### 2.1 TypeScript & Type Safety
- Every API response **must** have a corresponding TypeScript interface/type.
- Interfaces must mirror backend DTOs exactly — same field names, same nullability.
- Never use `any`. Use `unknown` + type guard if shape is uncertain.
- Export all API-facing interfaces from a central `types/` directory (e.g., `types/api.ts`).

```ts
// ✅ Correct — explicit, nullable fields declared
interface UserResource {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
}

// ❌ Wrong — hides contract
const user: any = await fetchUser();
```

### 2.2 Data Fetching Strategy Decision Tree

Choose the strategy based on data characteristics:

| Data Type | Strategy | Rationale |
|---|---|---|
| Static / rarely changes | ISR (`revalidate`) | Low server load, near-static perf |
| Per-request, SEO-critical | SSR (`getServerSideProps`) | Fresh + indexed |
| User-specific, private | CSR + SWR/React Query | No SSR leakage |
| Shared, fast-changing | SWR with polling | Real-time feel |
| Hybrid (layout=static, data=dynamic) | ISR + client hydration | Best of both |

Always document the chosen strategy and why in a comment at the top of the file.

### 2.3 Loading & Error States
Every data-fetching component **must** handle:
- `loading` / `isLoading` state — show skeleton or spinner
- `error` state — show user-friendly message, log full error
- `empty` state — explicit empty UI, never silent blank

### 2.4 Hydration Safety
- Never access `window`, `document`, or browser-only APIs during SSR without a guard.
- Use `typeof window !== 'undefined'` or `useEffect` for client-only code.
- Ensure server-rendered HTML matches client initial render — mismatches cause hydration errors.

### 2.5 Re-render Control
- Wrap pure components with `React.memo` when receiving stable prop shapes.
- Use `useCallback` for handlers passed as props.
- Use `useMemo` for expensive derived values.
- Stabilize `key` props — never use array index for dynamic lists from the API.

### 2.6 Tailwind CSS Conventions
- Use Tailwind utility classes exclusively — no inline styles except for truly dynamic values.
- For dynamic values (e.g., user-supplied colors), use CSS variables or `style={{ }}` + Tailwind var utilities.
- Keep component-level class lists readable: group by layout → spacing → typography → color → state.
- Extract repeated class combos to a `cn()` helper (clsx + tailwind-merge pattern).

```ts
// Recommended cn() helper
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. Backend (Laravel) Rules

### 3.1 Request Validation
- Every mutating endpoint (POST, PUT, PATCH, DELETE) **must** use a dedicated `FormRequest` class.
- Never validate in the controller directly for production endpoints.
- Validation rules must cover: presence, type, format, range, uniqueness where applicable.
- Return `422 Unprocessable Entity` for validation failures (Laravel default — do not override).

```php
// ✅ Correct
class StoreUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
        ];
    }
}

// ❌ Wrong — validation in controller
public function store(Request $request) {
    $request->validate([...]); // do not do this in production controllers
}
```

### 3.2 Response Standardization
- All API responses **must** use Laravel API Resources (`JsonResource` / `ResourceCollection`).
- Never return raw Eloquent models or `response()->json($model)`.
- Standard envelope for paginated lists:

```json
{
  "data": [...],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 15, "total": 73 },
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." }
}
```

- Standard envelope for single resources:

```json
{
  "data": { ... }
}
```

- Standard error envelope:

```json
{
  "message": "Human-readable description",
  "errors": { "field": ["Validation error text"] }
}
```

### 3.3 HTTP Status Codes (Mandatory)

| Situation | Code |
|---|---|
| Successful read | 200 |
| Successful creation | 201 |
| Successful update/delete with body | 200 |
| Successful update/delete, no body | 204 |
| Validation failure | 422 |
| Unauthenticated | 401 |
| Unauthorized (authenticated but forbidden) | 403 |
| Not found | 404 |
| Server error | 500 |

Never return 200 for errors.

### 3.4 Architecture Layers
Maintain layer separation:

```
Controller  →  validates request, delegates, returns response
Service     →  business logic, orchestration
Repository  →  database queries (if repository pattern is in use)
Resource    →  shapes API response
```

- Controllers must not contain query logic.
- Services must not know about HTTP (no `Request`, no `Response`).
- If repository pattern is NOT present in the codebase, use Eloquent directly in services. Do NOT introduce repository pattern unless explicitly requested.

### 3.5 Database Migrations
- Every migration must be **reversible** — always implement `down()`.
- Never drop columns or tables in an `up()` without a corresponding `down()` restore.
- For production-safe column removal: use a two-phase approach (first make nullable/stop using it; separate migration to drop).
- Never rename columns in-place — add new column, backfill, deprecate old.
- Always test `php artisan migrate:rollback` after writing a migration.

---

## 4. Data Contract Alignment

For **every** frontend-backend interaction, produce the following contract block:

```
#### Contract: [Feature Name] — [HTTP Method] [Endpoint]

**Request**
| Field | Type | Required | Validation Rules |
|-------|------|----------|-----------------|
| ...   | ...  | ...      | ...             |

**Response (Success — HTTP 2xx)**
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| ...   | ...  | ...      | ...   |

**Response (Error)**
| HTTP Code | Condition | Body Shape |
|-----------|-----------|------------|
| 422 | Validation failure | `{message, errors}` |
| 404 | Resource not found | `{message}` |

**TypeScript Interface**
\`\`\`ts
interface [Name]Resource { ... }
interface [Name]Request { ... }
\`\`\`

**Laravel Resource**
\`\`\`php
// app/Http/Resources/[Name]Resource.php
public function toArray(Request $request): array { ... }
\`\`\`
```

### 4.1 Naming Mismatch Detection
Always check for:
- Snake_case (Laravel) vs camelCase (TypeScript/JS) — Next.js must handle or a transformer must be applied consistently.
- Boolean field naming: Laravel convention `is_active` vs JS convention `isActive`.
- Date fields: Laravel returns ISO 8601 strings — TypeScript should type as `string`, not `Date`.
- ID fields: Laravel typically `int`, ensure frontend types as `number` not `string`.

### 4.2 Over/Under-Fetching
- If a Resource returns fields the frontend never uses → flag as over-fetching, suggest sparse fieldset or separate resource.
- If a frontend component requires a field not in the Resource → flag as under-fetching, update resource.

---

## 5. Temporary Test Artifacts

Every backend or API change requires temporary verification artifacts. Mark every test file with:

```php
// TEMPORARY TEST — safe to delete after verifying [feature name]
// Remove: php artisan route:list | grep temp- (to find), then delete this file
```

### 5.1 Laravel PHPUnit Tests (Backend)

Structure for a typical feature test:

```php
// tests/Feature/[FeatureName]Test.php — TEMPORARY
class StoreUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_user_with_valid_data(): void { ... }
    public function test_returns_422_with_missing_name(): void { ... }
    public function test_returns_422_with_duplicate_email(): void { ... }
    public function test_unauthenticated_request_returns_401(): void { ... }
    public function test_response_shape_matches_contract(): void { ... }
}
```

Run with: `php artisan test tests/Feature/[FeatureName]Test.php`

### 5.2 API Test Routes (Quick Smoke Tests)

For rapid endpoint verification in local/staging, a temporary route can be added:

```php
// routes/api.php — TEMPORARY BLOCK — remove after verification
if (app()->environment('local', 'staging')) {
    Route::get('/temp-test/users', function () {
        // Quick shape verification
        $user = User::factory()->make();
        return new UserResource($user);
    });
}
```

### 5.3 Frontend Mock Verification

When testing frontend against a new contract before backend is ready:

```ts
// __tests__/api/users.test.ts — TEMPORARY
describe('UserResource contract', () => {
  it('response shape matches TypeScript interface', () => {
    const mockResponse: UserResource = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      email_verified_at: null,
      created_at: '2024-01-01T00:00:00.000000Z',
    };
    expect(mockResponse).toBeDefined();
    // TypeScript itself validates shape at compile time
  });
});
```

### 5.4 Removal Instructions
After verification is complete:
1. Delete `tests/Feature/[FeatureName]Test.php` (or move to permanent test suite if worth keeping)
2. Remove any `temp-test` routes from `routes/api.php`
3. Delete any `__tests__/api/*.temp.test.ts` files
4. Run `php artisan test` to confirm no regressions

---

## 6. Cross-Layer Validation Checklist

Run this checklist mentally for every full-stack change:

```
DB Schema
  [ ] Migration is reversible
  [ ] Column types match intended data (e.g., decimal not float for money)
  [ ] Nullable/not-null constraints are intentional
  [ ] Indexes added for queried/filtered columns

Laravel Backend
  [ ] FormRequest validates all inputs
  [ ] Resource exposes only intended fields
  [ ] No raw model returns
  [ ] Status codes are correct
  [ ] No N+1 queries (use ->with() for relations)
  [ ] Service layer contains business logic, not controller

API Contract
  [ ] Request schema documented
  [ ] Response schema documented
  [ ] Error envelopes consistent
  [ ] No snake_case/camelCase mismatch unaddressed

Next.js Frontend
  [ ] TypeScript interface matches response exactly
  [ ] Nullable fields handled (no unchecked .property access on null)
  [ ] Loading state renders correctly
  [ ] Error state renders correctly
  [ ] Empty state renders correctly
  [ ] Hydration-safe (no SSR/client mismatch)
  [ ] No console errors or TypeScript errors (tsc --noEmit passes)

End-to-End
  [ ] Frontend sends correct Content-Type (application/json)
  [ ] Auth headers sent on protected routes
  [ ] CORS configured for frontend origin in Laravel
  [ ] Environment variables used (never hardcoded URLs/keys)
```

---

## 7. Output Section Templates

### Section 1 — Code Implementation

```
#### Backend: [File path]
\`\`\`php
[code]
\`\`\`

#### Frontend: [File path]
\`\`\`tsx
[code]
\`\`\`
```

### Section 2 — Data Contract Definition

Use the contract block format from Section 4.

### Section 3 — Temporary Test Artifacts

```
#### Test: [Description]
**File:** `[path]` — TEMPORARY, safe to delete after [specific condition]
**Run:** `[command]`
**Expected:** [what passing looks like]
\`\`\`php|ts
[test code]
\`\`\`
```

### Section 4 — Validation Checklist

```
- [x] FormRequest validates all fields
- [x] Resource hides internal fields (e.g., password)
- [x] TypeScript interface matches response
- [x] Loading/error/empty states present
- [x] No breaking change to existing consumers
- [ ] [REQUIRES CONFIRMATION] — [what needs verification]
```

### Section 5 — Risk Assessment

```
**Breaking changes:** [None / List with migration path]
**Migration risk:** [None / Low / Medium / High — explanation]
**Rollback plan:** [How to undo if deployed]
**Edge cases identified:**
  - [case 1]
  - [case 2]
**[UNVERIFIED]:** [anything assumed but not confirmed from provided context]
```

---

## 8. DevOps & Production Safety

### 8.1 Environment Parity
- Never hardcode URLs, credentials, or environment-specific values.
- Use `.env` (Laravel) and `.env.local` / `.env.production` (Next.js).
- Confirm which env vars exist before referencing them. Tag missing vars as `[REQUIRES CONFIRMATION]`.

### 8.2 Cache Invalidation
- **Laravel cache:** If a cached query/value is modified by this change, explicitly call `Cache::forget()` or `Cache::tags([...])->flush()` in the relevant service method.
- **Next.js ISR:** If data changed by this feature is rendered via ISR, document the revalidation path and `revalidatePath()` / `revalidateTag()` calls needed.
- **Next.js Router Cache:** After mutations, call `router.refresh()` or use `revalidatePath` in Server Actions.

### 8.3 Build Integrity
- All TypeScript must pass `tsc --noEmit` with zero errors.
- All PHP must pass `php artisan test` with zero failures.
- Never commit code that produces console errors or TypeScript warnings (treat warnings as errors).

### 8.4 CORS
Laravel must have the frontend origin in `config/cors.php`:
```php
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],
```
Never use `'*'` for authenticated APIs.

### 8.5 API Versioning Awareness
- If the API is versioned (e.g., `/api/v1/`), always confirm which version is being modified.
- Never change a versioned endpoint's response shape without a new version or explicit approval.

---

## 9. Common Patterns Reference

### 9.1 Authenticated API Call (Next.js → Laravel)

```ts
// lib/api.ts
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${getToken()}`, // implement getToken() per auth strategy
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, error.message, error.errors);
  }

  return res.json();
}
```

### 9.2 SWR with Error Handling

```ts
const { data, error, isLoading } = useSWR<UserResource>(
  '/api/v1/users/me',
  (url) => apiFetch<{ data: UserResource }>(url).then((r) => r.data)
);

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage message={error.message} />;
if (!data) return <EmptyState />;
```

### 9.3 Laravel Service Pattern

```php
// app/Services/UserService.php
class UserService
{
    public function create(array $validated): User
    {
        return DB::transaction(function () use ($validated) {
            $user = User::create($validated);
            // side effects here (events, notifications)
            return $user;
        });
    }
}

// app/Http/Controllers/Api/UserController.php
public function store(StoreUserRequest $request, UserService $service): JsonResponse
{
    $user = $service->create($request->validated());
    return (new UserResource($user))->response()->setStatusCode(201);
}
```

### 9.4 Laravel API Resource with Conditional Fields

```php
public function toArray(Request $request): array
{
    return [
        'id'                 => $this->id,
        'name'               => $this->name,
        'email'              => $this->email,
        'email_verified_at'  => $this->email_verified_at?->toISOString(),
        'created_at'         => $this->created_at->toISOString(),
        // Conditionally include admin-only fields
        'role'               => $this->when($request->user()?->isAdmin(), $this->role),
    ];
}
```

---

## 10. Behavioral Constraints (Non-Negotiable)

1. **No hallucinated APIs or fields.** If a field or method is not in the provided code/schema, do not invent it.
2. **No undocumented assumptions.** Every assumption is labeled `[UNVERIFIED]` or `[REQUIRES CONFIRMATION]`.
3. **No breaking changes without explicit identification.** If a change breaks an existing contract, state it loudly in Risk Assessment.
4. **Prefer explicitness over brevity.** A longer, correct answer is better than a short, ambiguous one.
5. **Treat all code as production.** No `dd()`, no `var_dump()`, no `console.log()` in final output.
6. **End-to-end correctness is the only standard.** A backend that works but whose TypeScript types are wrong is not correct.