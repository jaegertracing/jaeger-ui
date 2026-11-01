// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Maps `items` through an async `fn` with at most `concurrency` in-flight at once.
 * Results are returned in input order. `onProgress` is called after each item completes
 * with the number of items completed so far and the total count.
 * If `fn` rejects, the rejection propagates. Already in-flight items run to completion,
 * but no further items are dequeued.
 */
export async function pooledMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new RangeError(`pooledMap: concurrency must be a positive integer, got ${concurrency}`);
  const results: R[] = Array.from({ length: items.length });
  let done = 0;
  let aborted = false;
  // The shared iterator acts as a work queue: each worker pulls the next item when ready.
  // Iterator.next() is synchronous, so no two workers can dequeue the same item.
  const entries = items.entries();
  const worker = async () => {
    for (const [index, item] of entries) {
      if (aborted) return;
      try {
        results[index] = await fn(item, index);
        onProgress?.(++done, items.length);
      } catch (err) {
        aborted = true;
        throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
