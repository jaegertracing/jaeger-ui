// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Maps `items` through an async `fn` with at most `concurrency` in-flight at once.
 * Results are returned in input order. `onProgress` is called after each item completes
 * with the number of items completed so far and the total count.
 */
export async function pooledMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  if (concurrency < 1) throw new RangeError(`pooledMap: concurrency must be >= 1, got ${concurrency}`);
  const results: R[] = Array.from({ length: items.length }) as R[];
  let done = 0;
  // Shared iterator: each worker pulls the next (index, item) pair atomically via
  // the JS engine's native iterator protocol, so no two workers can take the same item.
  const entries = items.entries();
  const worker = async () => {
    for (const [index, item] of entries) {
      results[index] = await fn(item, index);
      onProgress?.(++done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
