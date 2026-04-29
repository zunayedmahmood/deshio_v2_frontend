# 🎯 Errum V2 — Campaign & Coupon System: Complete Scenario Map

> **Purpose:** This document maps every meaningful user-facing scenario for the Promotions system across the storefront. It is intended as a living reference for both the product owner and the implementing engineer. Each scenario includes trigger conditions, expected behavior per component, edge cases, and implementation notes.

---

## 🗺️ System Overview

```
PROMOTION TYPES IN SCOPE
─────────────────────────────────────────────────────────────────
  ✅ Percentage Discount     (e.g. 20% off)
  ✅ Fixed Amount Discount   (e.g. $10 off)
  ❌ Buy X Get Y             (out of scope)
  ❌ Free Shipping           (out of scope)

VISIBILITY MODES
─────────────────────────────────────────────────────────────────
  🌍 Public     → Auto-applied, no code needed
  🔒 Private    → Requires coupon code entry at checkout
```

---

## 🧩 Component Responsibility Matrix

| Component | Public % | Public $$ | Private % | Private $$ |
|---|---|---|---|---|
| **ProductCard** | ✅ Show badge + strike-through | ❌ No display | ❌ No display | ❌ No display |
| **ProductDetail** | ✅ Show badge + strike-through | ❌ No display | ❌ No display | ❌ No display |
| **Cart** | ✅ Show applied discount line | ✅ Show applied discount line | ❌ Hidden until code applied | ❌ Hidden until code applied |
| **Checkout** | ✅ Show applied | ✅ Show applied | ✅ Coupon input field | ✅ Coupon input field |
| **Order Summary** | ✅ Show discount | ✅ Show discount | ✅ Show discount (post-apply) | ✅ Show discount (post-apply) |

---

## 📋 Scenario Index

| # | Scenario | Type | Visibility | Scope |
|---|---|---|---|---|
| 1 | Sitewide percentage sale | % | Public | All products |
| 2 | Category-scoped percentage sale | % | Public | Category |
| 3 | Product-scoped percentage sale | % | Public | Specific products |
| 4 | Sitewide fixed amount off | $$ | Public | All products |
| 5 | Fixed amount off with minimum purchase | $$ | Public | All products |
| 6 | Private percentage coupon | % | Private | All products |
| 7 | Private percentage coupon scoped to category | % | Private | Category |
| 8 | Private fixed amount coupon | $$ | Private | All products |
| 9 | Cart has sale items + private coupon applied | Mixed | Mixed | Specific |
| 10 | Multiple promotions — stacking conflict | % + $$ | Mixed | All |
| 11 | Coupon code entered for wrong product scope | % | Private | Specific |
| 12 | Coupon usage limit reached | % | Private | All |
| 13 | Per-customer usage limit reached | % | Private | All |
| 14 | Promotion expired | % | Public | All |
| 15 | Promotion not yet started | % | Public | All |
| 16 | Maximum discount cap on percentage coupon | % | Private | All |
| 17 | Guest user attempts private coupon | % | Private | All |
| 18 | Customer-scoped private coupon | % | Private | Specific customers |
| 19 | Cart subtotal falls below minimum after item removal | $$ | Private | All |
| 20 | Zero-value order after discount (discount > total) | $$ | Public | All |
| 21 | Product removed from scope mid-session | % | Public | Specific products |
| 22 | Campaign deactivated while customer is in checkout | % | Public | All |
| 23 | Multiple cart items — some in scope, some not | % | Public | Specific products |
| 24 | Coupon applied then item quantity changed | % | Private | All |
| 25 | Staff manually applies promotion to an existing order | $$ | Private | All |

---

## 📌 Detailed Scenarios

---

### Scenario 1 — Sitewide Percentage Sale (Public)
**Type:** Percentage | **Visibility:** Public | **Scope:** All Products

```
Trigger: active promotion, type=percentage, is_public=true, no product/category scope
```

**Behavior by Component:**

- **ProductCard:** Show a `SALE` badge. Strike through the original price. Show the discounted price in red/accent color.
- **ProductDetail:** Same as ProductCard. Show "X% OFF" tag near the price.
- **Cart:** Automatically show a "Promotion Applied" line item with the discount amount in green.
- **Checkout:** Show discount in the order summary. No coupon input field needed.
- **Order Confirmation:** Show the discount line in the receipt.

**Implementation Notes:**
- The frontend must call `GET /promotions/active` on page load (or via a global context/store) to fetch all currently active public promotions.
- The `calculateDiscount()` result should be cached in cart state — do not recalculate on every render.
- The `SALE` badge on ProductCard must only appear if the promotion's `applicable_products` or `applicable_categories` includes that product (or is null/empty = sitewide).

---

### Scenario 2 — Category-Scoped Percentage Sale (Public)
**Type:** Percentage | **Visibility:** Public | **Scope:** One or more categories

```
Trigger: active promotion, type=percentage, is_public=true, applicable_categories=[id1, id2]
```

**Behavior by Component:**

- **ProductCard:** Only products belonging to the scoped categories show the sale badge and discounted price. Products outside the category look normal.
- **Cart:** Only line items from the scoped category show a discounted price. Others are full price.
- **Checkout:** Discount line reflects only the eligible items.

**Edge Cases:**
- If a product belongs to multiple categories and one of those is scoped, it qualifies.
- ProductCard must check `product.category_id` against the promotion's `applicable_categories` array.

**Implementation Notes:**
- Inject active promotions into a React context (e.g., `PromotionContext`) so all ProductCard instances can check eligibility without individual API calls.
- The cart subtotal shown to the user should clearly separate full-price and discounted items.

---

### Scenario 3 — Product-Scoped Percentage Sale (Public)
**Type:** Percentage | **Visibility:** Public | **Scope:** Specific products

```
Trigger: active promotion, type=percentage, is_public=true, applicable_products=[pid1, pid2]
```

**Behavior by Component:**

- **ProductCard (scoped product):** Sale badge, strikethrough, discounted price.
- **ProductCard (other products):** No change.
- **Cart:** Discount only applies to matching line items.

**Edge Cases:**
- If the same product is scoped by both a category-level and a product-level promotion simultaneously, see Scenario 10 (stacking conflict).

**Implementation Notes:**
- ProductCard component should receive the resolved final price (after checking all active promotions), not compute it inline.
- Recommend a utility function `getApplicablePromotion(productId, activePromotions)` that returns the best/only applicable promotion for a given product.

---

### Scenario 4 — Sitewide Fixed Amount Off (Public)
**Type:** Fixed Amount | **Visibility:** Public | **Scope:** All Products

```
Trigger: active promotion, type=fixed_amount, is_public=true, no product/category scope
```

**Behavior by Component:**

- **ProductCard:** ❌ Do NOT show a discounted price on the card. Fixed amounts cannot be shown per-item because they apply to the order total, not individual items.
- **Cart:** Show "- $X.XX" as a discount line at the bottom of the cart summary.
- **Checkout:** Show the discount line clearly in the order total breakdown.

**Key Rule:** Fixed amount discounts are **order-level**, not product-level. ProductCards must never show a modified price for fixed-amount promotions.

**Edge Cases:**
- If the fixed amount ($10) exceeds the cart total ($8), see Scenario 20.

---

### Scenario 5 — Fixed Amount Off with Minimum Purchase (Public)
**Type:** Fixed Amount | **Visibility:** Public | **Scope:** All Products | **Minimum:** e.g. $50

```
Trigger: active promotion, type=fixed_amount, is_public=true, minimum_purchase=50.00
```

**Behavior by Component:**

- **Cart (subtotal < minimum):** Show a subtle progress bar or message: *"Add $X more to unlock $Y off!"*
- **Cart (subtotal ≥ minimum):** Show the discount line applied.
- **Checkout:** If minimum is met, discount is in the summary. If not (rare race condition — item removed), show an alert that the promotion no longer applies.

**Implementation Notes:**
- Track `cart.subtotal` in state reactively. Re-evaluate promotion eligibility whenever subtotal changes.
- The "unlock" message is a strong UX feature — implement it as a `PromotionProgressBar` sub-component.

---

### Scenario 6 — Private Percentage Coupon (Sitewide)
**Type:** Percentage | **Visibility:** Private | **Scope:** All Products

```
Trigger: promotion exists, type=percentage, is_public=false, requires code entry
```

**Behavior by Component:**

- **ProductCard / ProductDetail:** No badge, no price change — the coupon is unknown to the system until entered.
- **Cart:** No discount shown by default.
- **Checkout:** A **Coupon Code Input** field must be present. If it doesn't exist in the current UI, it must be added.
  - Input field with "Apply" button.
  - On success: show ✅ "Coupon XXXX applied — saving Y%!"
  - On failure: show ❌ inline error message (invalid code, expired, usage limit, etc.)
- **Order Summary:** Shows discount line after successful application.

**Implementation Notes:**
- The coupon input must call `POST /promotions/validate` or `POST /promotions/apply-code` with `{ code, cart_items, customer_id }`.
- Store the applied coupon in checkout state so it persists if the user navigates between checkout steps.
- If the user removes all items from cart, clear the applied coupon.

---

### Scenario 7 — Private Percentage Coupon Scoped to a Category
**Type:** Percentage | **Visibility:** Private | **Scope:** Category

```
Trigger: promotion, type=percentage, is_public=false, applicable_categories=[id1]
```

**Behavior by Component:**

- **Checkout (coupon applied):** Discount applies only to cart items matching the category. Non-matching items are full price.
- The discount line should clarify: *"Coupon applied to eligible items (Category Name)"*.

**Edge Cases:**
- Cart has zero items from the scoped category. The coupon technically validates (correct code, active dates) but produces $0 discount. Show a warning: *"This coupon applies to [Category], but none of your items qualify."*

---

### Scenario 8 — Private Fixed Amount Coupon
**Type:** Fixed Amount | **Visibility:** Private | **Scope:** All Products

```
Trigger: promotion, type=fixed_amount, is_public=false, code required
```

**Behavior by Component:**

- **Checkout:** Coupon input field. On success, subtract the fixed amount from order total.
- Minimum purchase check still applies if configured.

**Edge Cases:**
- If `minimum_purchase` is set and not met, the validation API should return an error. The UI must display: *"This coupon requires a minimum order of $X."*

---

### Scenario 9 — Cart Has Sale Items + Private Coupon Applied
**Type:** Mixed | **Visibility:** Mixed

```
Cart: products A (public % sale) + product B (no sale)
Coupon: private % off all products
```

**Expected Behavior:**
- Product A already has a public discount applied (per Scenario 3).
- When the private coupon is entered at checkout, a decision must be made: **can promotions stack?**
- **Recommended default (no stacking):** Apply only the better discount per item. If the system doesn't support stacking, the private coupon either:
  - Replaces the public promotion entirely (simpler), OR
  - Applies only to non-discounted items (more complex)

**Implementation Notes:**
- This must be a defined business rule, not left to chance. The backend `calculateDiscount()` method must have a clear precedence rule.
- Recommended: document a `promotion_priority` field or a `stackable` boolean on the promotion model.
- The checkout UI must clearly show which discount is active and why.

---

### Scenario 10 — Multiple Active Promotions (Stacking Conflict)
**Type:** Multiple | **Visibility:** Mixed

```
Two active public promotions simultaneously:
  - Promo A: 15% off all products
  - Promo B: $10 off orders over $50
```

**Decision Points:**
1. **No stacking:** Apply only the most beneficial promotion (calculate both, use the higher saving).
2. **Stacking allowed:** Apply both sequentially (percentage first, then fixed).

**Implementation Notes:**
- The backend should handle this logic; the frontend should not compute this itself.
- UI must show which promotions are active and whether they're combined or only the best is applied.
- If only one is applied, show a tooltip or note explaining why the other wasn't used.

---

### Scenario 11 — Coupon Entered for Wrong Product Scope
**Type:** Percentage | **Visibility:** Private | **Scope:** Specific products

```
Customer enters a valid coupon that only applies to Product X.
Their cart only contains Product Y.
```

**Behavior:**
- Backend validates the code as structurally valid but returns 0 discount because no cart items match the scope.
- Frontend must NOT silently accept the code.
- Show: *"This coupon is valid but doesn't apply to any items in your cart."*
- Do not add it to the applied coupons state.

---

### Scenario 12 — Global Usage Limit Reached
```
Promotion: max_uses=500, current usage_count=500
Customer enters the code.
```

**Behavior:**
- Backend returns an error: `PROMOTION_LIMIT_REACHED`
- Frontend shows: ❌ *"Sorry, this coupon has reached its usage limit."*
- The coupon field remains editable for the customer to try another code.

---

### Scenario 13 — Per-Customer Usage Limit Reached
```
Promotion: max_uses_per_customer=1
Customer has already used this code on a previous order.
```

**Behavior:**
- Backend returns: `CUSTOMER_LIMIT_REACHED`
- Frontend shows: ❌ *"You've already used this coupon."*

---

### Scenario 14 — Promotion Expired
```
Promotion: end_date=yesterday
Customer attempts to use the code (or it was previously bookmarked).
```

**Behavior:**
- For **public** promotions: should not appear in the active promotions feed at all (backend filters by date). If somehow still cached on the frontend, the cart must revalidate on load.
- For **private coupons**: Backend returns `PROMOTION_EXPIRED`. Frontend shows: ❌ *"This coupon has expired."*
- ProductCards that were showing sale prices due to a now-expired public promotion must revert on next data fetch.

**Implementation Notes:**
- Never rely on frontend-only date checks for promotion validity. Always confirm via the backend API.
- Set a short cache TTL (or use SWR/React Query's revalidation) for active promotions.

---

### Scenario 15 — Promotion Not Yet Started
```
Promotion: start_date=tomorrow
Staff accidentally shares coupon code early.
Customer tries to use it.
```

**Behavior:**
- Backend returns: `PROMOTION_NOT_STARTED`
- Frontend shows: ❌ *"This coupon isn't valid yet. Check back soon!"*

---

### Scenario 16 — Maximum Discount Cap on Percentage Coupon
```
Promotion: type=percentage, discount=30%, max_discount_amount=$20
Cart total: $100 → 30% = $30 → capped at $20
```

**Behavior:**
- The backend calculates $30 but applies only $20 due to the cap.
- Frontend must show: *"30% OFF (max $20 applied)"* so the customer understands why the saving appears less than expected.

**Implementation Notes:**
- The API response for discount calculation should return both `calculated_amount` and `applied_amount` so the UI can render the capped message transparently.

---

### Scenario 17 — Guest User Attempts Private Coupon
```
Visitor without an account enters a coupon code at checkout.
```

**Decision Points:**
- If the promotion has `applicable_customers` or per-customer tracking, a `customer_id` is required.
- If the guest checkout flow doesn't require login:
  - Apply the coupon if it has no customer-scoping or per-customer limit.
  - Block the coupon with *"Please log in to use this coupon."* if customer-specific.

**Implementation Notes:**
- The checkout flow must pass `customer_id: null` for guests.
- Backend must gracefully handle null customer_id — do not crash; instead return appropriate eligibility result.

---

### Scenario 18 — Customer-Scoped Private Coupon
```
Promotion: applicable_customers=[customer_id_42]
Different customer (customer_id_99) enters the code.
```

**Behavior:**
- Backend returns: `CUSTOMER_NOT_ELIGIBLE`
- Frontend shows: ❌ *"This coupon isn't available for your account."*
- Do not reveal that the coupon is valid for someone else (security/privacy).

---

### Scenario 19 — Cart Subtotal Falls Below Minimum After Item Removal
```
Cart: $60 subtotal, private $10 coupon with min_purchase=$50 applied.
Customer removes an item → subtotal drops to $45.
```

**Behavior:**
- On item removal, re-evaluate all applied promotions.
- The $10 coupon no longer qualifies.
- Show a dismissible warning: ⚠️ *"Your coupon has been removed because your cart no longer meets the $50 minimum."*
- Clear the coupon from checkout state.

**Implementation Notes:**
- Cart state changes (quantity, removal) must trigger a promotion re-validation step.
- This can be a lightweight local check (compare `subtotal` vs `minimum_purchase`) without a full API call.

---

### Scenario 20 — Discount Exceeds Order Total
```
Promotion: fixed $15 off
Cart total: $10
Net result: -$5 (invalid)
```

**Behavior:**
- Order total must floor at $0.00. Never go negative.
- The frontend should display: *"Discount applied — Order total: $0.00"*
- Backend must enforce this in `calculateDiscount()` and in the final order record.

**Implementation Notes:**
- Backend: `applied_amount = min(discount_amount, order_subtotal)`
- Frontend: display $0.00, never show negative numbers to users.

---

### Scenario 21 — Product Removed from Promotion Scope Mid-Session
```
Staff edits a running promotion to remove Product A from applicable_products.
Customer had Product A in their cart with a public sale badge showing.
```

**Behavior:**
- On next cart revalidation (page refresh, checkout load), the discount for Product A is gone.
- ProductCard re-fetches promotion data and removes the sale badge.
- If in checkout, the order summary re-calculates without the discount.

**Implementation Notes:**
- Implement a cart revalidation call (`POST /cart/validate`) at the start of the checkout page that re-confirms all prices and promotions.
- Never trust promotion data cached for more than a session without backend confirmation at checkout time.

---

### Scenario 22 — Campaign Deactivated While Customer Is in Checkout
```
Staff deactivates or force-expires a public promotion.
Customer is mid-checkout with that promotion reflected in their summary.
```

**Behavior:**
- When customer clicks "Place Order," the backend must re-validate all promotions before processing.
- If a promotion is no longer valid, the API returns an error with the updated totals.
- Frontend must show a modal/alert: *"A promotion in your order is no longer active. Your total has been updated."*
- Customer must confirm the new total before proceeding.

**Implementation Notes:**
- This is a critical checkout guard. The final `POST /orders` endpoint must re-run promotion validation — never trust frontend-computed totals for order creation.

---

### Scenario 23 — Cart Has Mixed Items (Some In Scope, Some Not)
```
Promotion: 20% off Category A only
Cart: 2x Product from Category A + 1x Product from Category B
```

**Behavior:**
- In cart and checkout, only Category A items show discounted prices or a discount contribution.
- Category B item is full price.
- The discount line shows the total savings from Category A items only.
- Clearly label: *"20% off eligible items"* rather than *"20% off your order"* to avoid confusion.

**Implementation Notes:**
- Cart line-item component should show individual discount annotations per item (small "PROMO" badge on eligible items).
- The order summary breakdown must itemize discounted vs. non-discounted subtotals.

---

### Scenario 24 — Coupon Applied, Then Item Quantity Changed
```
Private 10% coupon applied.
Cart: 1x Product at $100 → discount = $10
Customer changes quantity to 3 → cart = $300 → discount should = $30
```

**Behavior:**
- Quantity changes must trigger discount recalculation.
- The coupon remains applied; only the discount amount updates.
- If a `maximum_discount_amount` cap exists, it may now activate (see Scenario 16).

**Implementation Notes:**
- Discount recalculation should happen client-side optimistically (using stored promotion rules) and then be confirmed server-side at checkout.
- The coupon code should remain in the applied state — the user should not need to re-enter it after changing quantities.

---

### Scenario 25 — Staff Manually Applies Promotion to an Existing Order
```
Admin uses PromotionController@applyToOrder to retroactively add a discount to a placed order.
```

**Behavior:**
- This is a backend/admin operation, but the frontend Order Detail page (admin view) should reflect the updated total.
- The order's `promotion_id` and `discount_amount` fields are updated.
- A `promotion_usages` record is created.
- The customer-facing order history page should show the revised total and a note: *"Discount applied by support."*

**Implementation Notes:**
- This requires a `PATCH /orders/{id}/apply-promotion` endpoint or similar.
- Log the staff user who applied the promotion for audit purposes.
- Do not re-trigger payment — this is a credit/adjustment operation.

---

## 🔧 Global Implementation Checklist

### Backend (Laravel)
- [ ] `GET /promotions/active` — returns all currently active public promotions (filtered by date, status)
- [ ] `POST /promotions/validate-code` — validates a private coupon code against customer + cart context
- [ ] `POST /promotions/calculate` — returns the discount amount given cart contents + promotion
- [ ] `POST /orders` — always re-validates promotion before creating the order (never trust frontend total)
- [ ] `Promotion@calculateDiscount` — must return `{ calculated_amount, applied_amount, capped, reason }`
- [ ] Ensure `minimum_purchase` and `maximum_discount_amount` are enforced server-side

### Frontend (Next.js)
- [ ] `PromotionContext` — global React context holding all active public promotions, loaded on app init
- [ ] `getApplicablePromotion(productId)` — utility to check if a product has an active public promo
- [ ] `ProductCard` — show sale badge + discounted price only for public percentage promotions
- [ ] `Cart` — auto-apply public promotions; show discount line; revalidate on every item change
- [ ] `Checkout` — add coupon input field (if missing); handle all validation error states
- [ ] Checkout guard — re-confirm promotion validity on "Place Order" click
- [ ] `campaignService.ts` — add `validateCode()`, `calculateDiscount()`, `getActivePromotions()` methods
- [ ] Never show negative order totals; floor at $0.00
- [ ] Clear applied coupon if cart is emptied or minimum not met

---

## 🚦 Error State Reference

| Error Code | User-Facing Message |
|---|---|
| `PROMOTION_EXPIRED` | "This coupon has expired." |
| `PROMOTION_NOT_STARTED` | "This coupon isn't valid yet. Check back soon!" |
| `PROMOTION_LIMIT_REACHED` | "This coupon has reached its usage limit." |
| `CUSTOMER_LIMIT_REACHED` | "You've already used this coupon." |
| `CUSTOMER_NOT_ELIGIBLE` | "This coupon isn't available for your account." |
| `MINIMUM_NOT_MET` | "This coupon requires a minimum order of $X." |
| `NO_ELIGIBLE_ITEMS` | "This coupon doesn't apply to any items in your cart." |
| `PROMOTION_INACTIVE` | "This coupon is no longer active." |
| `INVALID_CODE` | "Invalid coupon code. Please check and try again." |

---

*Document Version 1.0 — Errum V2 Campaign System*