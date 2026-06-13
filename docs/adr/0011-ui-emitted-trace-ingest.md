# ADR-0011: Exporting UI-Emitted Traces Back to Jaeger

* **Status**: Accepted — backend and Phase 1 UI instrumentation implemented
* **Last Updated**: 2026-06-09
* **Tracking Issue**: [jaeger-ui#1307](https://github.com/jaegertracing/jaeger-ui/issues/1307)
* **Backend support**: [jaeger#8740](https://github.com/jaegertracing/jaeger/pull/8740) (merged 2026-06-08)

---

## TL;DR

The Jaeger UI emits its own OpenTelemetry traces (page loads, fetches to
`/api/*`, AI Assistant activity) and exports them via OTLP/HTTP to a
**same-origin endpoint mounted inside `jaeger-query`**:
`<basePath>/api/otlp/v1/traces`. The route is a reverse proxy to a
configurable upstream (default `http://127.0.0.1:4318`), so there is no
CORS surface and no second hostname for operators to expose. Tracing is
opt-in via the UI config block; disabled by default.

---

## Context

`jaeger-query` exposes a read-only `/api/*` surface. The UI itself has
client-side telemetry worth capturing — first-paint timing, `/api/*`
fetches, the AI Assistant's per-turn LLM/tool/fetch tree — but no
sanctioned path for that telemetry to reach the operator's existing
Jaeger backend.

Constraints on any solution:

1. The operator's business backend must not become a tracing gateway —
   browser telemetry has to flow without touching unrelated app servers.
2. The transport must work without CORS friction in the common case
   (UI and backend on the same origin).
3. Operators who run `jaeger` without a co-located `jaeger-collector`
   must still be able to enable UI tracing.
4. The auth/abuse posture of the write path must not be weaker than the
   query API's existing posture.

---

## Decision

### Transport: same-origin OTLP via `jaeger-query`

`jaeger-query` registers an OTLP/HTTP reverse proxy at
`<basePath>/api/otlp/v1/*` ([jaeger#8740](https://github.com/jaegertracing/jaeger/pull/8740)).
The route forwards to `extensions.jaeger_query.otlp_proxy.target`, default
`http://127.0.0.1:4318` (the OTel Collector's standard OTLP HTTP port).
Absence of the config block means the route is not registered at all
(returns 404).

The route emits `http.server.*` histograms for operator visibility but
does **not** generate a server span on itself, sidestepping the obvious
"trace our trace-ingest" loop.

The browser exports OTLP/HTTP to that path. Because the path is
same-origin with the UI, no CORS preflight applies and no allow-list
configuration is needed anywhere.

### Configuration

Tracing in the UI is controlled via the existing `getJaegerUiConfig()`
mechanism, in [`default-config.ts`](../../packages/jaeger-ui/src/constants/default-config.ts):

```ts
tracing?: {
  enabled?: boolean;                // default false
  serviceName?: string;             // default 'jaeger-ui'
  sampleRatio?: number;             // default 1.0
  sessionInactivityMinutes?: number; // default 30 — rotates session.id
};
```

The OTLP endpoint is not configurable. The UI always exports to a
same-origin `/api/otlp/v1/traces` path (site-prefixed for base-path
deployments). This matches the fixed convention used by every other
Jaeger API endpoint and avoids inviting cross-origin export setups
the otlp_proxy isn't designed for.

When `enabled` is false (the default) `initTracing()` is a no-op: no
provider is registered, no exporter is created, and any code paths that
ask the OTel global API for a tracer get a no-op tracer.

---

## In-UI tracing model

### What counts as a trace

A server trace usually corresponds to one inbound request. A browser
has no equivalent natural unit — page loads, route changes, clicks,
animations, and idle polling all issue backend calls — so the trace
boundary is a design choice. Four candidate roots cover the useful
shapes; they compose via OTel's active-context mechanism so each fetch
parents under the most specific currently-active root.

#### 1. Initial page load — ✅ **implemented**

| | |
|---|---|
| **What it captures** | `navigationStart` → `loadEventEnd`: DNS, TLS, HTML, every JS/CSS/font/image fetch, plus any app fetch issued before `window.load`. |
| **How** | `@opentelemetry/instrumentation-document-load` — reads `PerformanceNavigationTiming` and `PerformanceResourceTiming`, emits one root span (`documentLoad`) per page load. |
| **Pros** | Cheap, low-noise (exactly one trace per load), useful for first-paint debugging. |
| **Cons** | Bounded by `loadEventEnd`; in a Vite-built SPA the trace is dominated by chunk loading. Cross-origin resource timings are zeroed unless `Timing-Allow-Origin` is set (mostly irrelevant for Jaeger). |

#### 2. Route change (SPA navigation) — **deferred**

| | |
|---|---|
| **What it would capture** | One span per React Router push, covering the new view's mount and the wave of API calls it triggers. |
| **How** | No off-the-shelf instrumentation exists. Would require subscribing to React Router history changes, starting a `navigation` span with the matched route pattern, and choosing an end-condition (in-flight queries hit zero / `MutationObserver` quiet / fixed timeout). |
| **Pros** | The most useful root for "why was navigating to this view slow?" questions. |
| **Cons** | End-condition is inherently heuristic. Polling views and animation chains both confuse the obvious heuristics; a fixed timeout sometimes cuts off slow loads mid-trace. |
| **Status** | Deferred. Revisit after Phase 1 traces are in production. |

#### 3. User interaction (click / keypress) — **deferred**

| | |
|---|---|
| **What it would capture** | One span per user interaction; fetches and async work spawned inside the handler attach as children. |
| **How** | `@opentelemetry/instrumentation-user-interaction` — patches `addEventListener` and `Promise` so handler-spawned work stays in-context. |
| **Pros** | Directly answers "what backend work did this button trigger?" |
| **Cons** | Default span name is `"Event: click"` — useless without app-side `data-otel-name` or accessible-name plumbing. Every click becomes a trace, including tooltip-opens and other interaction noise. `setTimeout`/`MessageChannel` continuations lose context. |
| **Status** | Deferred. Will require a `data-otel-trace="true"` opt-in convention and a `spanNameProvider` before it produces signal worth shipping. |

#### 4. Named application operations (AI Assistant turn, etc.) — **deferred**

| | |
|---|---|
| **What it captures** | One span per app-defined operation with a known lifecycle. The AI Assistant turn is the canonical case: user message → LLM call(s) → tool call(s) → backend fetch(es) → response. |
| **How** | Manual `tracer.startActiveSpan(name, attrs, fn)` at the operation's entry point. All work inside the callback parents under the named span. |
| **Pros** | Cleanest data shape: honest name and accurate boundaries because the app code knows what it's doing. Extends to any other named operation worth timing (search, DAG layout, etc.). |
| **Cons** | Requires app-code edits at each named entry point. |
| **Status** | The OTel tracer API is available globally to any caller, but no named operation is wrapped yet. The AI Assistant runtime (`@ag-ui/client` `HttpAgent` via `@assistant-ui/react-ag-ui`) does not expose a per-turn lifecycle hook, so wrapping the conversational round requires subscribing to the assistant-ui runtime's thread state — a small follow-up. In the meantime the fetch instrumentation captures each AG-UI request as a single-span trace, page-attributed via the processor. |

### Fetch/XHR fallback — ✅ implemented

Independent of the four roots above, every outbound `/api/*` call
produces a fetch span via `@opentelemetry/instrumentation-fetch`. When a
root is active the fetch becomes its child; otherwise it becomes a
single-span trace. This is the bare-minimum guarantee — every backend
call is at least traced.

### Page attribution — ✅ implemented

Every span (including single-span fetch traces) carries:

| Attribute | Value | Purpose |
|---|---|---|
| `app.url.path` | `window.location.pathname` | Identifies the page that issued the call. Vendor-prefixed because the OTel-standard `url.path` is set by HTTP instrumentation to the *request* URL path and would clobber the page path on fetch spans. |
| `session.id` | The first span's `traceId`, persisted in `sessionStorage` and scoped per browser tab. | Groups all spans from one user session, per [OTel session semconv](https://opentelemetry.io/docs/specs/semconv/general/session/). |
| `session.previous_id` | The prior `session.id` (only on the first span after a session rotates). | Lets backends link a new session to the one it replaced when the inactivity timeout (default 30 min, see `tracing.sessionInactivityMinutes`) elapses. |

`app.route` (the matched React Router pattern) is intentionally **not**
emitted yet — the matched pattern is only resolvable inside the React
render tree, not from a `SpanProcessor`. Adding it requires either
threading the active match through context or moving span creation
inside a React-aware layer. Deferred with Phase 2.

### Composition

OTel's `Context` API maintains a single currently-active span per
execution chain. When a new span is created, it parents under whatever
is active. For a fetch issued from somewhere in the app:

1. Inside an **assistant turn** → parent = turn span.
2. Else inside a **user-interaction handler** (when Phase 2 ships) →
   parent = interaction span.
3. Else inside a **route-change navigation** (when Phase 3 ships) →
   parent = navigation span.
4. Else before `loadEventEnd` → parent = `documentLoad`.
5. Else → fetch is a root span (single-span trace).

The precedence is automatic: each candidate calls
`context.with(spanContext, fn)` and any descendant work picks the most
recently activated span as parent.

---

## End-to-end correlation with the backend

A browser-rooted trace is more useful if backend spans it triggers share
the same trace ID. The W3C Trace Context spec offers two ways to wire
this, with materially different trust properties.

### UI propagates `traceparent` — ✅ default, implemented

The standard OTel JS fetch instrumentation injects `traceparent` on
same-origin fetches automatically; no config needed. The UI mints the
trace ID, sends it on each `/api/*` fetch, and when `jaeger-query`
gains server-side OTel HTTP middleware it reads `traceparent` and
parents its server span under the browser span.

**Pros**: Standard OTel SDK behavior; zero additional code.

**Cons — the trust problem**: the trace ID is generated by an untrusted
client. A malicious page could forge a trace ID that collides with an
existing trace (data integrity), cross tenant boundaries in multi-tenant
deployments (data leakage), or pollute trace-ID cardinality. For
Jaeger's typical single-tenant, behind-auth deployment, these risks are
low: the same user who can issue forged IDs can already read every
trace in the backend.

### Backend issues trace IDs via `traceresponse` — alternative, not implemented

The W3C Trace Context Level 2 draft defines a `traceresponse` response
header that lets a server tell the client which trace context it
actually used. The pattern flips the trust model: the server mints the
trace ID, the UI reads `traceresponse` and re-tags its in-flight span.

**Pros**: Trace IDs are minted server-side, so a malicious client can
only poison its own trace.

**Cons**: Standard OTel JS does not support this. Implementing it
requires a custom fetch hook to read the response header, a way to
rewrite an in-flight span's trace ID (no public SDK API for this), and
a policy for parallel fetches in the same operation. Effectively
requires forking `@opentelemetry/sdk-trace-web`.

Revisit when OTel JS gains first-class `traceresponse` support, or
when Jaeger gains a multi-tenant deployment story where the backend
cannot trust browser-supplied IDs.

---

## Alternatives considered (transport)

| Pattern | What it is | Why not chosen |
|---|---|---|
| **Direct cross-origin to vendor** (e.g. Datadog RUM intake) | UI POSTs to a vendor's hosted ingest endpoint with a per-project token. | Jaeger is not a vendor; baking in a public ingest origin doesn't fit. |
| **Customer-controlled tunnel/proxy on a first-party origin** (Sentry `tunnel`, Datadog RUM `proxy`) | Customer runs a relay that forwards to a hosted vendor. | Operators can already build this with NGINX in front of `jaeger-collector`; nothing to bless in the UI. |
| **Direct cross-origin to `jaeger-collector`** | Browser exports OTLP/HTTP cross-origin to a CORS-enabled `jaeger-collector`. Made possible by [jaeger#4459](https://github.com/jaegertracing/jaeger/issues/4459). | Pushes `allowed_origins` config onto every operator and exposes a writable port to end-user browsers. Re-establishing the query API's auth posture on the collector port is per-deployment work. Operators who need this can put a reverse proxy in front of `jaeger-collector` themselves; the UI does not bless the pattern. |
| ✅ **Same-origin ingest on the UI server** ← **chosen** | OTLP/HTTP proxy in `jaeger-query` at `/api/otlp/v1/*`. | No CORS. One deployment shape (query port already exposed). Auth piggybacks on whatever protects `/api/traces`. Composes with the OTLP-native migration in [ADR 0002](./0002-otlp-api-v3-migration.md). |
| **`navigator.sendBeacon` with `text/plain` to dodge preflight** (Sentry trick) | Use a CORS-safelisted content type to skip preflight on cross-origin. | Unnecessary once ingest is same-origin. |

OpenTelemetry's own guidance is that browsers should not export
directly to a Collector — recommended deployment puts a reverse proxy
in front for TLS and CORS. The chosen design is that reverse proxy,
co-located with the UI server.

---

## Open questions

1. **Abuse / rate-limiting on the proxy route.** The proxy in
   [jaeger#8740](https://github.com/jaegertracing/jaeger/pull/8740)
   relies on the upstream OTLP receiver being loopback-only as its only
   abuse control. Before defaulting the UI on in production deployments,
   a per-IP rate limit and payload-size cap on the proxy route are
   worth landing.
2. **Span-naming convention for Phase 2/3.** When user-interaction and
   route-change spans land, they will need a consistent span-name
   convention and a small set of `data-otel-*` attributes. Worth a
   short follow-up ADR.

---

## References

- OpenTelemetry JS Exporters (browser-compatible exporters; reverse-proxy
  recommendation): https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Collector `confighttp` (CORS schema, default off):
  https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- [jaeger#4459](https://github.com/jaegertracing/jaeger/issues/4459) — CORS headers on the collector's OTLP HTTP endpoint
- [jaeger#8740](https://github.com/jaegertracing/jaeger/pull/8740) — Same-origin OTLP proxy in `jaeger-query`
- [jaeger-ui#1307](https://github.com/jaegertracing/jaeger-ui/issues/1307) — Tracking issue
- [jaeger-ui#1627](https://github.com/jaegertracing/jaeger-ui/pull/1627) — Prior closed browser-instrumentation attempt
- Sentry envelope spec (CORS-safelisted content types):
  https://develop.sentry.dev/sdk/foundations/transport/envelopes/
- Sentry tunnel guidance:
  https://docs.sentry.io/platforms/javascript/troubleshooting/
- Datadog RUM proxy guide:
  https://docs.datadoghq.com/real_user_monitoring/guide/proxy-rum-data/
- Honeycomb browser SDK docs:
  https://docs.honeycomb.io/send-data/javascript-browser
- OpenTelemetry demo `frontend-proxy`:
  https://opentelemetry.io/docs/demo/services/frontend-proxy/
- Grafana Cloud Frontend Observability data-proxy:
  https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/configure/data-proxy/
