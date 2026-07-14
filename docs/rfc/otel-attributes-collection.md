# RFC: An `IAttributes` Collection Type for OTel Span Data

* **Status**: RFC
* **Last Updated**: 2026-07-14

---

## TL;DR

Replace the raw `IAttribute[]` arrays stored on `IOtelSpan`, `IResource`, `IScope`, `IEvent`, and `ILink` with a single shared collection type, `IAttributes`, that never exposes the underlying array. Instead of an array, callers get key-addressed access — `getValue(key)`, `has(key)` — backed by a lazily-built index, plus a deliberately awkward enumeration API (`keys()`, `entries()`) for the genuine "process the whole collection" cases. The goal is to make the O(1) key lookup the obvious path and remove the `.find(a => a.key === '…')` footgun at the type level, so nobody can casually re-implement a linear scan for a single attribute.

---

## Context & Problem

Attributes are stored today as a flat `IAttribute[]` (`packages/jaeger-ui/src/types/otel.ts`), where `IAttribute` is `{ key: string; value: AttributeValue }`. The same array shape is reused on every attribute-bearing level: `IOtelSpan.attributes`, `IResource.attributes`, `IScope.attributes`, `IEvent.attributes`, `ILink.attributes`.

Because the array is exposed directly, code that needs one specific attribute re-scans the whole array with `.find(a => a.key === '…')` — or a hand-rolled `for` loop — on every call. This pattern is duplicated across the codebase and grows every time we surface a new semantic-convention field. It is also a subtle performance trap: Jaeger UI is tested with traces up to 80k spans, and per-interaction code paths in the trace timeline that do a linear attribute scan per span turn an O(1) lookup into O(n).

An audit of the current code found the following exact-key lookups on the OTel span family:

| Site | Current pattern |
|------|-----------------|
| `TraceTimelineViewer/spanPills.ts` | `.find(a => a.key === key)` over fixed HTTP-status keys |
| `TraceTimelineViewer/VirtualizedTraceView.tsx` | `.find(attr => attr.key === PEER_SERVICE)` |
| `TraceStatistics/tableValues.ts` (×2) | `.find` + hand-rolled `for` loop, dynamic key |
| `TraceStatistics/generateDropdownValue.ts` | hand-rolled `for` loop, single-key existence check |
| `model/link-patterns.ts` | `getParameterInArray` over both `span.attributes` and `span.resource.attributes` |
| `SpanDetail/GenAITab/genAiData.ts` | already builds its own `indicesByKey` map because ~15 lookups accumulated in one file |
| `model/OtelSpanFacade.ts` (×5, legacy `Span.tags`) | `span.kind`, `error`, `otel.library.name`/`version`, event `event` field |

Two related patterns are **not** the target and stay legitimate:

* **Prefix / namespace scans** (Category B): `key.startsWith('gen_ai.')` in `TracePage/index.tsx` and `utils/genai/detect.ts`, the namespace priority scan in `span-icons.ts`. These genuinely iterate.
* **Full transforms / rendering** (Category C): collecting every key in `generateDropdownValue.ts`, the full text scan in `filter-spans.ts`, and the render pass-throughs in `SpanDetail`, `AccordionEvents`, `GenAITab`, `TraceLogsView`.

Notably `TDenseSpan` (trace-dag) already stores attributes as a `{ [key]: value }` map, and `genAiData.ts` builds its own index — clear evidence that consumers keep re-inventing per-key access because the base model doesn't offer it. The root cause is that exposing the raw array makes `.find` the path of least resistance.

---

## Proposed Design

Introduce one collection type, owned by the model, that wraps the array plus a lazily-built index and exposes no array:

```typescript
export interface IAttribute {
  key: string;
  value: AttributeValue;
}

export interface IAttributes {
  /** O(1) lookup of the first attribute with the given key; undefined if absent. */
  getValue(key: string): AttributeValue | undefined;

  /** True if any attribute has the given key. */
  has(key: string): boolean;

  /** Unique keys, for prefix/namespace scans and key collection. */
  keys(): ReadonlyArray<string>;

  /**
   * DO NOT USE THIS UNLESS YOU REALLY NEED TO PROCESS THE WHOLE COLLECTION
   * (e.g. rendering every attribute or a full-text search). For looking up a
   * specific attribute by key, use getValue()/has() — they are O(1). Calling
   * .find()/.filter() on the result of entries() re-introduces the exact
   * linear-scan footgun this type exists to remove.
   */
  entries(): ReadonlyArray<IAttribute>;

  readonly size: number;
}
```

The `attributes` field on `IOtelSpan`, `IResource`, `IScope`, `IEvent`, and `ILink` changes type from `IAttribute[]` to `IAttributes`. The field name stays `attributes`, so call sites become `span.attributes.getValue('peer.service')`.

Backing implementation: a small class that stores the source array and lazily builds a `Map<string, AttributeValue>` on first key access. First-wins semantics preserve today's `.find` behavior. The `OtelSpanFacade` already filters out null/undefined values, so `undefined` from `getValue` unambiguously means "absent." Construction accepts a plain `IAttribute[]` (or the legacy `KeyValuePair[]` via the facade's existing `toOtelAttributes`), so the write side barely changes.

Every current call site maps cleanly onto the new API:

* **Exact-key lookup** → `getValue(key)` (O(1)) — the 8 OTel + 5 legacy sites.
* **Prefix / namespace scan** → `keys()` + `startsWith`.
* **Render-all / collect-all / text-scan** → `entries()` / `keys()`.

`genAiData.ts`'s claim-and-consume index has different semantics (it *removes* keys as it reads them, to compute a leftover "other" bucket), so it is left as-is for now, or optionally seeded from the collection in a follow-up.

### Decision: enumeration API shape

The one real design choice is how to permit legitimate whole-collection iteration without re-opening the footgun. Options, scored against the criteria that matter here (🟢 good · 🟡 partial · 🔴 poor):

| Criterion | A. `keys()`+`getValue()` only | B. + `entries()` array | C. iterable (`for..of`) + `getValue()` |
|-----------|-------------------------------|------------------------|----------------------------------------|
| Render all key/value pairs | 🔴 must rebuild pairs via `keys().map` | 🟢 `entries()` direct | 🟢 `[...attrs]` / `for..of` |
| Discourages accidental `.find` lookup | 🟢 nothing to scan | 🟡 possible but ergonomically discouraged¹ | 🟡 possible but ergonomically discouraged¹ |
| Preserves duplicate-key values | 🔴 `getValue` is first-wins only | 🟢 `entries()` keeps all | 🟢 keeps all |
| Ergonomics for the common case | 🟡 | 🟢 | 🟢 |

¹ `entries()`/iteration can still be `.find`'d, but `getValue` is right there and is the obviously-cheaper, obviously-intended path; a loud comment (above) plus review discipline covers the rest.

**Decision: B.** `getValue` + `has` + `keys` + `entries`, with a strong "do not use unless you really need the whole collection" warning on `entries()`. `entries()` covers rendering and full-text filtering without exposing a mutable array; `getValue` stays the obvious path for the lookups that matter. First-wins on `getValue`/`keys`, full fidelity on `entries()` — matching today's `.find` semantics.

---

## Migration Plan & Size

This is a **type change**, so the TypeScript compiler surfaces every affected site — a single compiler-guided PR is cleaner than staging, because `attributes: IAttribute[]` → `attributes: IAttributes` cannot be half-applied (the array API and the collection API can't coexist on the same field without defeating the purpose).

Estimated footprint:

* **~1 new file** — `IAttributes` type + implementation, with unit tests (present/absent/duplicate keys, empty, `keys`/`entries`/`size`, lazy-index correctness).
* **~2 files** for the type + construction change — `types/otel.ts`, `model/OtelSpanFacade.ts`.
* **~12 source files** migrated at call sites (mostly one- or two-line mechanical edits): `spanPills.ts`, `VirtualizedTraceView.tsx`, `tableValues.ts`, `generateDropdownValue.ts`, `link-patterns.ts`, `TracePage/index.tsx`, `utils/genai/detect.ts`, `utils/filter-spans.ts`, and the render pass-throughs in `SpanDetail/index.tsx`, `AccordionEvents.tsx`, `GenAITab/index.tsx`, `TraceLogsView/index.tsx`.
* **~11 test files** that build span fixtures as raw arrays or read `span.attributes` as an array — these need a fixture helper to wrap arrays into `IAttributes`, or updates to use the new API.

So: roughly **25 files**, the large majority mechanical, with the only non-trivial logic in the new type and the test-fixture adaptation. It is a medium-sized but low-risk PR. Explicitly out of scope: `TDenseSpan`'s map, the DDG path model in `transformTracesToPaths.ts`, and any change to the wire/storage shape of attributes.

To keep the diff reviewable, a thin `attributesFromArray(IAttribute[])` fixture/constructor helper is worth adding first so test setup and the facade share one construction path.

---

## Alternatives Considered

* **Add `getAttribute(key)` to `IOtelSpan` but keep `attributes: IAttribute[]`.** Smallest diff and gives the O(1) path, but leaves the array — and therefore `.find` — fully exposed, so it does not prevent regressions. Rejected as not addressing the root cause.
* **A standalone `findAttribute(arr, key)` helper with no type change.** Zero ripple, but no caching (re-scans each call) and equally fails to remove the footgun. Rejected.
* **Store attributes as a plain `Record<string, AttributeValue>` map.** Simple and O(1), but loses attribute order (which rendering relies on) and cannot represent duplicate keys that legacy `tags` can carry. Rejected in favor of a wrapper that keeps the source array intact behind the API.

---

## Open Questions

* **Naming**: `IAttributes` vs `IAttributeCollection` vs `IAttributeSet`. `IAttributes` keeps the field read `span.attributes.getValue(...)` natural.
* **Redux/serialization**: the collection is a class instance, so if attributes ever live in serialized state, they become non-plain. `IOtelSpan` is *already* a class (`OtelSpanFacade`), so this is consistent with the existing model rather than a new departure — but worth confirming no reducer deep-clones or serializes span attributes.
* **`getValue` typing**: return the raw `AttributeValue` union (current proposal) vs adding typed sugar like `getString(key)` / `getNumber(key)`. Defer until call sites show a strong pull — many currently cast to `string`.
