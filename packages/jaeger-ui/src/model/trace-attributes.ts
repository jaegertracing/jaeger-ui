// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export function deduplicateAttributes<T extends { key: string; value: unknown }>(
  spanAttributes: ReadonlyArray<T>
) {
  const warningsHash: Map<string, string> = new Map<string, string>();
  const attributes: T[] = [];
  const seen = new Map<string, Set<T['value']>>();
  for (const attribute of spanAttributes) {
    const values = seen.get(attribute.key);
    if (!values || !values.has(attribute.value)) {
      if (values) {
        values.add(attribute.value);
      } else {
        seen.set(attribute.key, new Set([attribute.value]));
      }
      attributes.push(attribute);
    } else {
      warningsHash.set(
        `${attribute.key}\0${typeof attribute.value}\0${String(attribute.value)}`,
        `Duplicate tag key="${attribute.key}" value="${String(attribute.value)}"`
      );
    }
  }
  const warnings = Array.from(warningsHash.values());
  return { attributes, warnings };
}

export function orderAttributes<T extends { key: string }>(
  spanAttributes: ReadonlyArray<T>,
  topPrefixes?: readonly string[]
) {
  const orderedAttributes: T[] = spanAttributes.slice();
  const tp = (topPrefixes || []).map((p: string) => p.toLowerCase());

  orderedAttributes.sort((a, b) => {
    const aKey = a.key.toLowerCase();
    const bKey = b.key.toLowerCase();

    for (let i = 0; i < tp.length; i++) {
      const p = tp[i];
      if (aKey.startsWith(p) && !bKey.startsWith(p)) {
        return -1;
      }
      if (!aKey.startsWith(p) && bKey.startsWith(p)) {
        return 1;
      }
    }

    if (aKey > bKey) {
      return 1;
    }
    if (aKey < bKey) {
      return -1;
    }
    return 0;
  });

  return orderedAttributes;
}
