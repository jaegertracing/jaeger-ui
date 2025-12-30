# Vertex Key Utilities

This module provides utilities for working with hierarchical vertex keys in Jaeger's trace DAG (Directed Acyclic Graph).

## Background

In Jaeger's trace graph visualization, spans are organized into a DAG where each node represents a unique combination of service and operation. To identify these nodes, we use **vertex keys** - specially formatted strings that encode the hierarchical path from the root to a specific node.

### Format

Vertex keys use two special separator characters:

- **Vertical Tab (`\u000b` or `\v`)**: Separates hierarchy levels in the path
- **Tab (`\t`)**: Separates service name and operation name within each level
- **Leaf Marker (`__LEAF__`)**: Indicates a leaf node (no children)

Example:
```
serviceA\topA\vserviceB\topB\t__LEAF__
```

This represents a path from `serviceA:opA` → `serviceB:opB` (leaf).

## Why This Module?

Previously, components like `TraceStatistics` were directly parsing vertex keys using `split('\u000b')`, which:
1. Leaked implementation details across component boundaries
2. Created tight coupling between unrelated parts of the codebase
3. Made the code harder to understand and maintain

This module encapsulates all vertex key manipulation logic in one place.

## API

### Constants

- `VERTEX_KEY_PATH_SEPARATOR` - The character used to separate hierarchy levels (`\v`)
- `VERTEX_KEY_PART_SEPARATOR` - The character used to separate service and operation (`\t`)
- `VERTEX_KEY_LEAF_MARKER` - The marker for leaf nodes (`__LEAF__`)

### Functions

#### `parseVertexKey(vertexKey: string): IVertexKeyPart[]`

Parses a hierarchical vertex key into its constituent parts.

```typescript
const parts = parseVertexKey("serviceA\topA\vserviceB\topB\t__LEAF__");
// Returns:
// [
//   { service: "serviceA", operation: "opA", isLeaf: false },
//   { service: "serviceB", operation: "opB", isLeaf: true }
// ]
```

#### `getLeafPart(vertexKey: string): IVertexKeyPart | null`

Gets the leaf (most specific) part of a vertex key.

```typescript
const leaf = getLeafPart("serviceA\topA\vserviceB\topB\t__LEAF__");
// Returns: { service: "serviceB", operation: "opB", isLeaf: true }
```

#### `vertexKeyMatches(vertexKey: string, serviceName?: string, operationName?: string): boolean`

Checks if a vertex key matches given criteria (service name, operation name, or both). Only the leaf part is checked.

```typescript
vertexKeyMatches(key, "serviceB"); // true if leaf contains "serviceB"
vertexKeyMatches(key, undefined, "opB"); // true if leaf contains "opB"
vertexKeyMatches(key, "serviceB", "opB"); // true if leaf matches both
```

## Usage

### When to Use This Module

Use this module when:
- Working with vertex keys from the trace graph DAG
- Need to parse or match against vertex key structure
- Implementing features that interact with the trace graph visualization

### When NOT to Use This Module

Don't use this module when:
- Working with span IDs (simple strings, not hierarchical keys)
- Working with span filtering (`filterSpans` returns span IDs, not vertex keys)
- Implementing table views or list views of spans (these use span attributes directly)

## Important Note

**Vertex keys are only used in the trace graph visualization.** Most other components (like `TraceStatistics`, `TraceSpanView`) work with:
- Span IDs (simple strings from `filterSpans`)
- Span attributes (service name, operation name, tags)
- Direct span objects from the trace data

Don't confuse vertex keys with these simpler data structures!
