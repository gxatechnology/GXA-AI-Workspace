# Centralized pricing, entitlements, and checkout

## Canonical ownership

`shared/platformRegistry.ts` is the only source of plan identity, public pricing,
rank, entitlements, and limits. Server responses serialize this registry; React
components do not contain paid-price fallbacks.

| Key | Name | Monthly price | Checkout path |
| --- | --- | ---: | --- |
| `free` | Free | ₹0 | No payment |
| `pro` | Pro | ₹99 | Razorpay, 9,900 paise |
| `pro_plus` | Pro Plus | ₹149 | Razorpay, 14,900 paise |
| `team` | Team | Contact Sales | Stored sales enquiry |
| `enterprise` | Enterprise | Custom Pricing | Stored sales enquiry |

Only monthly billing is supported for paid self-service plans. There is no
annual price, calculated discount, default coupon, or implicit trial. Legacy
text aliases are normalized to canonical keys, but numeric values are never
accepted as plan identifiers.

## Source audit and disposition

- `shared/platformRegistry.ts`: retained as the canonical backend/shared plan
  registry and expanded with deterministic plan keys, public metadata, feature
  requirements, ranks, and prices in minor currency units.
- `db.json.config`: legacy display-price strings, promotional copy, sample
  coupons, and sample trial values were removed. Operational tool limits remain.
- `server/platform.ts`: legacy subscription values are normalized during the
  additive migration; tenant and subscription history are preserved.
- `server/billing.ts`: provider order creation, verification, webhook activation,
  plan selection, public serialization, feature gates, billing events, and sales
  leads are centralized here.
- `server.ts`: exposes the public pricing API and authenticated checkout APIs.
  Existing platform aliases remain for compatibility.
- `src/components/workspaces/Pricing.tsx`, `src/components/UpgradeModal.tsx`, and
  `src/components/workspaces/EnterprisePlatform.tsx`: consume server responses;
  none can choose a price or activate a subscription.
- Tool-specific premium modals and inline plan/price lists were removed in favor
  of the single feature-aware upgrade modal.

## Public and authenticated APIs

- `GET /api/pricing/plans` — public active plans, display features, limits, and
  Razorpay availability. Provider credentials and internal product IDs are never
  included.
- `POST|GET|DELETE /api/pricing/selection` — creates, reads, or cancels the
  opaque HttpOnly selected-plan state. The state expires after 45 minutes and is
  associated with the authenticated account and tenant after login.
- `GET /api/pricing/features/:featureKey` — server-resolved access, minimum plan,
  and eligible upgrades for a feature.
- `POST /api/pricing/contact-sales` — validates and stores Team or Enterprise
  enquiries; it never starts a payment checkout.
- `GET /api/billing/current-plan` and `GET /api/entitlements/current` — server
  subscription status, effective plan, limits, and feature access.
- `POST /api/billing/checkout` — authenticated Razorpay order creation from the
  server-owned selection and registry price.
- `POST /api/billing/verify` — signature plus provider order/payment validation;
  records verification only and does not activate a subscription.
- `POST /api/billing/webhook` — raw-body signature validation and idempotent
  subscription activation/status handling.

## Checkout invariants

1. The selected plan is stored server-side behind a random opaque HttpOnly
   cookie; browser storage is not checkout authority.
2. Registration or login associates the still-valid selection with that account
   and returns the user to billing for paid self-service plans.
3. Checkout rejects a missing, expired, mismatched, free, contact-sales,
   unsupported-interval, current-plan, or downgrade selection.
4. The backend sets amount and currency from the canonical registry. Client
   amount, product, price, and entitlement values are ignored.
5. Callback verification checks the HMAC signature and fetches the provider
   payment to match order, amount, currency, status, user, tenant, plan, and
   replay state.
6. Only a valid signed webhook activates the exact pending plan. A Pro Plus
   order cannot resolve to Pro. Older provider events cannot overwrite newer
   subscription state.

## Migration and rollback

Schema version 13 is additive. It creates `pendingPlanSelections`,
`pendingCheckouts`, `processedPayments`, `contactSalesLeads`, and
`billingEvents` when absent, and normalizes recognized legacy plan aliases. It
does not delete users, tenants, subscriptions, projects, content, usage, or
payment history.

Before production deployment:

1. Back up the durable database volume.
2. Run `npm run migration:dry-run` against the production database path.
3. Review the reported stores and plan normalizations.
4. Run `npm run migration:apply`. The script writes its own timestamped backup
   before atomically replacing the JSON file.

Rollback the application deployment first. If a data rollback is required,
stop writers, preserve the current database for audit, then restore the
timestamped pre-migration backup. Because the migration is additive, an older
application can also ignore the new stores while a controlled rollback is
prepared.

## Required production environment

- `APP_ORIGIN` — canonical application origin (or comma-separated trusted
  origins used by the server).
- `GXA_DB_FILE` — durable writable database path. A packaged ephemeral path is
  not suitable for production billing state.
- `PLATFORM_ENCRYPTION_KEY` — server secret used to protect recoverable platform
  signing material.
- `RAZORPAY_KEY_ID` — server-side checkout key identifier.
- `RAZORPAY_KEY_SECRET` — server-side order and payment verification secret.
- `RAZORPAY_WEBHOOK_SECRET` — server-side webhook HMAC secret.
- `GEMINI_API_KEY` — existing backend AI provider key.

Never prefix payment or AI secrets with `VITE_`, commit them, or return them in
an API response. Configure the Razorpay webhook to the production
`/api/billing/webhook` endpoint and subscribe to the supported payment and
subscription status events.

The repository currently persists billing state through the JSON database
adapter. Vercel's local filesystem is ephemeral, so checkout intentionally
fails closed on Vercel even when Razorpay credentials are configured. Before
enabling live payment on Vercel, replace the JSON adapter with a durable shared
database that can atomically store pending checkouts, processed payments,
subscriptions, and webhook idempotency records. This guard prevents a customer
from being charged on one serverless invocation while a later webhook cannot
find the checkout that must activate access.

## Deployment notes

Vercel rewrites `/api/:path*` to the single `api/index.ts` function. The adapter
restores the original Express URL without consuming or transforming request
bodies, which is necessary for raw Razorpay webhook signature verification.
Static SPA routes continue to build into `dist`.
