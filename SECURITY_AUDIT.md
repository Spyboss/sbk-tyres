# Security Audit Report — SBK Tyres Dealer Portal

Date: 2026-03-23

## Executive Summary

This repository is a static-exported Next.js 14 dealer portal that relies on Supabase for authentication and data access from the browser. The most significant risk is **access control drift between the frontend and the database**: the application performs most authorization checks client-side, while the real enforcement boundary is expected to be Supabase Row Level Security (RLS). In this model, any missing or overly broad RLS policy immediately becomes an exploitable data exposure or privilege-escalation issue.

The most important code-level findings are:

1. **Broken access control in the admin users screen**: any authenticated user who can load `/admin/users` passes `checkUser()` and triggers a `select('*')` query against `profiles`; only the mutation controls are hidden for non-admins. If RLS is permissive, a dealer can enumerate all users and profile data. Severity: **High**.
2. **Overbroad service-worker caching of authenticated content**: the service worker caches arbitrary `GET` responses, including application routes and potentially sensitive responses. On shared devices or after logout, stale authenticated content can remain available offline. Severity: **High**.
3. **Missing hardening headers / CSP**: the exported app has no visible Content-Security-Policy, `frame-ancestors`, `X-Content-Type-Options`, or `Referrer-Policy` controls in app code, despite loading remote assets and handling authenticated dealer/admin views. Severity: **Medium**.
4. **Security-critical trust in Supabase RLS without repository evidence**: the README claims RLS enforces role-based access, but no SQL migration or policy definitions are present in this repository. Given the client-side direct database access pattern, missing RLS would be catastrophic. Severity: **Medium** (code/configuration gap; impact would become **Critical** if RLS is absent or weak in production).

Dependency review found **no directly confirmed exploitable dependency CVE in the currently used code paths** from the sources checked, but the project is behind current supported releases in several places. In particular, `next@14.2.15` is older than the latest current release line and also falls inside the affected version range for **CVE-2025-57822** (patched in `14.2.32`), though that advisory specifically concerns applications using custom Middleware and this repository currently does **not** contain a middleware/proxy implementation.

## Critical / High Severity Vulnerabilities

### 1) Broken access control and user enumeration in `/admin/users`

**Severity:** High  
**Category:** Broken Access Control / Sensitive Data Exposure / IDOR-adjacent administrative exposure

**Location:** `app/admin/users/page.tsx`

```tsx
const checkUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.push('/login')
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    router.push('/catalog')
    return
  }

  setUserRole(profile.role)
  setIsAdmin(profile.role === 'admin')
}

const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
```

**Why this is vulnerable**

`checkUser()` only verifies that the authenticated user has *some* profile row. It does **not** enforce `admin` or `staff` before calling `fetchUsers()`. Since `fetchUsers()` runs for any truthy `userRole`, any logged-in dealer can reach the page and trigger a full read of `profiles`. The UI only hides some controls with `isAdmin`, but hiding UI is not authorization.

**Exploit scenario**

A dealer signs in, browses directly to `/admin/users`, and the page attempts to load all profile data. If Supabase RLS for `profiles` is misconfigured (or temporarily disabled during maintenance), the attacker can enumerate company names, email addresses, phone numbers, and roles for all users. That data can be used for credential-stuffing, phishing, social engineering, or identifying privileged accounts.

If the matching RLS update policy is also weak, the attacker could modify `role` by replaying the same client request used by `updateUserRole()`.

**Practical fix**

Enforce role checks **before** rendering the page or issuing any admin query, and keep the database policy as the final authority.

**Minimal client-side fix**

```tsx
const checkUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.push('/login')
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
    router.push('/catalog')
    return
  }

  setUserRole(profile.role)
  setIsAdmin(profile.role === 'admin')
}
```

**Required database fix (recommended)**

Use explicit RLS policies so only admins/staff can read all profiles and only admins can update roles. Example pattern:

```sql
alter table profiles enable row level security;

create policy "admins and staff can read all profiles"
on profiles
for select
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
  or id = auth.uid()
);

create policy "only admins can update roles"
on profiles
for update
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
```

Also consider moving user/role administration to a server-controlled endpoint or Supabase Edge Function that re-validates admin privileges.

---

### 2) Service worker caches authenticated application content without route sensitivity

**Severity:** High  
**Category:** Sensitive Data Exposure / Security Misconfiguration / Session residue

**Location:** `public/sw.js`

```js
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
          return response;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
```

**Why this is vulnerable**

The fetch handler caches nearly every successful `GET` response with no allowlist, no auth-state awareness, no path exclusions for `/orders`, `/admin`, or Supabase-related requests, and no cache-control filtering. That creates two problems:

1. Authenticated pages and API responses can persist offline after logout.
2. On shared kiosks/devices, another user can potentially see cached dealer/admin content when offline or during transient network failures.

Because this application is a PWA and contains dealer/admin data, caching rules should be explicit and conservative.

**Exploit scenario**

An admin uses a shared warehouse tablet, visits `/admin/orders` or `/admin/users`, then logs out. Later, another person opens the app while offline or under flaky connectivity. The service worker may serve cached authenticated assets or data-bearing responses that should no longer be available.

**Practical fix**

Restrict service-worker caching to static assets only; never cache authenticated pages, admin routes, or API/database responses.

**Safer example**

```js
const STATIC_PATHS = new Set([
  '/',
  '/catalog',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
]);

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const isStaticAsset = STATIC_PATHS.has(url.pathname) ||
    url.pathname.startsWith('/_next/static/');

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(event.request, { cache: 'no-store' });
      if (!response.ok) return response;
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
      return response;
    })
  );
});
```

Also clear application caches on logout and avoid registering the service worker on authenticated-only deployments unless offline support is a real requirement.

## Medium / Low Severity Vulnerabilities

### 3) Missing security headers and Content Security Policy

**Severity:** Medium  
**Category:** Security Misconfiguration / XSS impact reduction gap

**Location:** `app/layout.tsx`, `public/_headers`

The app metadata and `<head>` content do not define a CSP or related hardening headers. Cloudflare Pages supports a `_headers` file, and this repository already contains `public/_headers`, but the active app code shown here does not establish a restrictive policy for scripts, frames, object embedding, referrers, or MIME sniffing.

**Why this matters**

React escapes most HTML by default, which lowers classic reflected/stored XSS risk, but CSP is still an important containment layer for:

- future unsafe HTML rendering,
- compromised third-party assets,
- service-worker/script injection,
- clickjacking, and
- form/data exfiltration.

**Recommended fix**

Add strict response headers through Cloudflare Pages `_headers` (for static responses) and keep them in source control.

Example starter policy for a static export:

```txt
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https://res.cloudinary.com; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';
```

If additional third-party origins are required, add them deliberately instead of using broad wildcards.

---

### 4) Security-critical dependency on Supabase RLS, but policies are absent from the repo

**Severity:** Medium  
**Category:** Security Misconfiguration / Architecture risk

**Location:** `README.md`, `lib/supabase.ts`, `app/**`

The application talks directly to Supabase from the browser using the public anon key and performs reads/writes for products, orders, order items, and profiles on the client. The README states that “RLS policies enforce role-based access,” but this repository does not contain SQL migrations or policy definitions proving that protection.

**Why this matters**

In this architecture, RLS is the *real* access-control boundary. If even one production table lacks correct policies, a user can bypass hidden UI controls and call Supabase directly with the anon key. Consequences could include:

- reading all orders,
- editing product prices/stock,
- promoting roles,
- viewing all dealer profile data.

**Recommended fix**

- Store all schema migrations and RLS policies in version control.
- Add automated checks (for example, a CI step that runs `supabase db diff` or validates the presence of expected policies).
- Document the intended policy matrix for each table: `profiles`, `products`, `orders`, `order_items`.

A minimal policy set should explicitly answer:

- Can anonymous users read active products?
- Can dealers read only their own orders and order_items?
- Can only admins/staff edit products?
- Can only admins change user roles?

---

### 5) Environment values committed in `wrangler.toml`

**Severity:** Low  
**Category:** Security hygiene / key management

**Location:** `wrangler.toml`

The repository commits `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Cloudflare Pages vars. The anon key is designed to be public, so this is **not a secret leak by itself**. However, committing live environment values encourages bad operational habits and makes future secret rotation harder if non-public values are ever added the same way.

**Recommended fix**

- Keep public values configurable through Cloudflare Pages project settings rather than committing live values.
- Never place service-role keys, database passwords, JWT signing secrets, or SMTP/API credentials in `wrangler.toml`.
- Add a short comment or docs note clarifying that only browser-safe public values belong in `NEXT_PUBLIC_*`.

## Dependency Audit

### Scope and method

I reviewed `package.json` / `package-lock.json` and checked current public advisories and official package pages. `npm audit` and `npm outdated` could not complete successfully in this environment because the registry returned HTTP 403 responses, so dependency findings below are based on direct package/advisory research rather than a full machine-generated advisory report.

### Findings

#### A) `next` is outdated and inside an advisory-affected range for Middleware SSRF

- **Current version in repo:** `^14.2.15`
- **Installed/locked family:** `14.2.15`
- **Relevant advisory:** GitHub Advisory **GHSA-4342-x723-ch2f / CVE-2025-57822**
- **Affected versions:** `< 14.2.32`
- **Patched version in 14.x line:** `14.2.32`
- **Latest npm version seen:** `15.5.2`

**Applicability to this repo:** the advisory requires custom Next.js Middleware behavior. I did **not** find a `middleware.ts` / `proxy.ts` file in this repository, so I did **not** confirm an exploitable instance in the current codebase. Still, the package version is behind a patched release and should be upgraded.

**Recommended upgrade path**

1. Update to the minimum patched 14.x version first:
   ```bash
   npm install next@14.2.32 eslint-config-next@14.2.32
   ```
2. Run:
   ```bash
   npm run build
   ```
3. If stable, plan a second-stage upgrade to the current maintained line (15.x) after reviewing breaking changes.

**Potential breaking changes**

- Moving from 14.x to 15.x may require updates for async request APIs and other framework changes. Review the official Next.js upgrade guide before a major-version move.

#### B) Supabase libraries are significantly behind current releases

- **Current versions in repo:** `@supabase/supabase-js@^2.39.0`, `@supabase/ssr@^0.1.0`
- **Latest npm version seen for `@supabase/supabase-js`:** `2.57.0`

I did **not** confirm a public security advisory affecting `2.39.0` from the sources reviewed, but both packages are well behind current releases. In a security-sensitive app, lagging auth/database client libraries increases the chance of missing fixes, protocol updates, and hardening improvements.

**Recommended upgrade path**

1. Upgrade incrementally:
   ```bash
   npm install @supabase/supabase-js@latest @supabase/ssr@latest
   ```
2. Test authentication flows:
   - login,
   - logout,
   - session refresh,
   - protected route behavior,
   - order placement and admin pages.
3. Verify any SSR/cookie API changes in Supabase docs.

**Potential breaking changes**

- Newer Supabase packages may change auth helper APIs or minimum supported Node/runtime versions. The upstream project notes that support for Node 18 was dropped in `supabase-js` `2.79.0`; if you intentionally stay on Node 18, pin carefully.

#### C) General dependency freshness

Other notable packages are also older than current ecosystem releases (`react-hook-form`, Radix packages, Tailwind-related packages, ESLint). I did not confirm CVEs for these from the reviewed sources, but the project would benefit from a routine monthly dependency review and patch cadence.

## Security Best Practices & Hardening Recommendations

These recommendations are tailored to this stack: **Next.js App Router + Supabase + Cloudflare Pages + PWA/service worker**.

### 1) Treat Supabase RLS as mandatory, not optional

Because the browser talks directly to Supabase with a public key:

- enable RLS on every exposed table,
- use explicit `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies,
- test negative cases (dealer attempting to read another dealer’s order),
- add policies for both row ownership and role-based admin exceptions,
- consider column-level restrictions for fields like role, phone, address, and internal notes.

### 2) Minimize client-side authority

- Do not rely on route hiding or UI controls for admin security.
- Prefer server-mediated admin actions (Edge Functions or server endpoints) for role changes, inventory edits, and order management.
- Keep the browser using the anon key only for the least-privileged operations it truly needs.

### 3) Add hardening headers everywhere

For a Cloudflare Pages deployment, define at minimum:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`

If the app remains a pure static export, prefer `public/_headers` for these controls.

### 4) Rework offline caching

- Cache only static assets.
- Exclude `/admin`, `/orders`, `/checkout`, and any authenticated response from service-worker caching.
- Clear caches on logout.
- Consider disabling offline mode for authenticated routes entirely.

### 5) Establish security logging and monitoring

- Log repeated auth failures and suspicious role/authorization failures.
- Monitor Supabase auth events and database audit trails.
- Add error tracking (for example Sentry) for auth/session anomalies.
- Enable dependency alerting (Dependabot/Renovate + GitHub security alerts).

### 6) Strengthen operational controls

- Keep Cloudflare Pages environment variables out of the repo where possible.
- Rotate the anon key if RLS has ever been weak or data exposure is suspected.
- Ensure service-role credentials exist only in server-side systems, never in client bundles.
- Document an incident response playbook for revoking sessions, rotating keys, and freezing writes.

### 7) Add security-focused tests

Recommended test cases:

- dealer cannot load any other dealer’s order,
- dealer cannot load `/admin/users`,
- staff can view admin data but cannot self-promote to admin unless intended,
- service worker does not cache authenticated routes,
- logout removes access to cached protected content,
- direct REST calls with the anon key fail for unauthorized operations.

## Resources & References

### Official / authoritative resources

- OWASP Top 10 2021: https://owasp.org/Top10/2021/
- Next.js Data Security guide: https://nextjs.org/docs/app/guides/data-security
- Next.js CSP guide: https://nextjs.org/docs/app/guides/content-security-policy
- Next.js `headers` config reference: https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers
- Next.js production checklist: https://nextjs.org/docs/app/guides/production-checklist
- Supabase: Securing your API: https://supabase.com/docs/guides/api/securing-your-api
- Cloudflare Pages headers docs: https://developers.cloudflare.com/pages/configuration/headers/
- GitHub Advisory for Next.js cache poisoning (historical baseline): https://github.com/advisories/GHSA-gp8f-8m3g-qvj9
- GitHub Advisory for Next.js middleware SSRF: https://github.com/advisories/GHSA-4342-x723-ch2f
- npm package page for `next`: https://www.npmjs.com/package/next
- npm package page for `@supabase/supabase-js`: https://www.npmjs.com/package/@supabase/supabase-js

### Recommended ongoing tooling

- GitHub Dependabot or Renovate for dependency updates
- Semgrep for SAST rules focused on Next.js / TypeScript
- Gitleaks for secret scanning
- OWASP ZAP for authenticated dynamic testing
- Supabase audit logs / database logs
- Cloudflare security analytics and WAF rules

## Notes / limitations

- This audit is based on the repository contents provided here; I did not receive the production Supabase schema, RLS SQL, Cloudflare dashboard configuration, or live deployment logs.
- I therefore treated missing RLS definitions as a **material risk indicator** rather than claiming a confirmed production misconfiguration.
- `npm audit` and `npm outdated` were attempted, but npm registry requests returned HTTP 403 in this environment.
