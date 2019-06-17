// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable no-bitwise */

import memoize from 'lru-memoize';

// This bucket size was chosen as JavaScript uses 32-bit numbers for bitwise operators, so the maximum number
// of indices that can be tracked in a single number is 32. Increasing from 31 visibility values per base36
// number to 32 visibility values would require an additional base36 character, which reduces the efficiency.
// For more info: https://repl.it/repls/IllfatedMaroonObservation
const VISIBILITY_BUCKET_SIZE = 31;

/*
 * Converts string csv of base36 numbers into array of JavaScript nubers.
 *
 * @param {string} key - base36 csv visibility key.
 * @returns {number[]} - JavaScript numbers that contain the same visibility data as the provided key.
 */
const getBuckets: (key: string) => number[] = memoize(10)((key: string): number[] =>
  key.split(',').map(partial => parseInt(partial || '0', 36))
);

/*
 * Given a visibility index, returns the index of the bucket that contains the given index and the power of
 * two that would reflect the given index being visible, relative to the bucket it resides in.
 *
 * @param {number} visibilityIdx - An index within the visibility key
 * @returns {object} - Two numbers relating to the given number.
 *     bucketIdx - Index of the JavaScript number in getBuckets that contains the visibility data for the
 *         given index.
 *     visibilityValue - A power of two that can be used with getBuckets(key)[bucketIdx] to determine if the
 *         given index is visible, or to change its visibility.
 */
function convertIdxToBucketValues(visibilityIdx: number) {
  const bucketIdx = Math.floor(visibilityIdx / VISIBILITY_BUCKET_SIZE);
  const digitIdx = visibilityIdx % VISIBILITY_BUCKET_SIZE;
  const visibilityValue = 1 << digitIdx;
  return { bucketIdx, visibilityValue };
}

/*
 * Determines if a given index is visible in a given key.
 *
 * @returns {string} - A base36 csv visibility key.
 * @param {number} visibleIdx - Index that may be visible in given key.
 * @returns {boolean} - If the given index is visible in the given key.
 */
export function isVisible(visibilityKey: string, visibilityIdx: number): boolean {
  const visibilityBuckets = getBuckets(visibilityKey);
  const { bucketIdx, visibilityValue } = convertIdxToBucketValues(visibilityIdx);
  return Boolean(visibilityBuckets[bucketIdx] & visibilityValue);
}

/*
 * Given a base36 csv visibility key, creates a new key with values shown/hiden as specified.
 *
 * @param {object} kwarg - Arguments for changeKey.
 * @param {string} key - base36 csv key to base new key off of.
 * @param {number[]} [show] - Indices that will be visible in new key.
 * @param {number[]} [hide] - Indices that will not be visible in new key.
 * @returns {string} - New base36 csv key.
 */
export function changeKey({ key, show, hide }: { key: string; show?: number[]; hide?: number[] }): string {
  // Slice is necessary to avoid mutating value in memo cache
  const visibilityBuckets = getBuckets(key).slice();
  const conflictCheck = new Set(show);

  if (hide) {
    hide.forEach(hideIdx => {
      if (conflictCheck.has(hideIdx)) {
        throw new Error(`Trying to show and hide same visibilityIdx: ${hideIdx} in same change`);
      }
      const { bucketIdx, visibilityValue } = convertIdxToBucketValues(hideIdx);
      // Since visibilityValue is a power of 2, this sets one bit to 0 and leaves the rest unchanged.
      visibilityBuckets[bucketIdx] &= ~visibilityValue;
    });
  }

  if (show) {
    show.forEach(showIdx => {
      const { bucketIdx, visibilityValue } = convertIdxToBucketValues(showIdx);
      // Since visibilityValue is a power of 2, this sets one bit to 1 and leaves the rest unchanged.
      visibilityBuckets[bucketIdx] |= visibilityValue;
    });
  }

  return visibilityBuckets
    .map(bucket => bucket.toString(36))
    .map(value => (value === '0' ? '' : value))
    .join(',');
}

/*
 * Creates a base36 csv visibility key with just the specified indices visible.
 *
 * @param {number[]} visibleIndices - Indices that will be visible in new key.
 * @returns {string} - Nev base36 csv visibility key.
 */
export function createKey(visibleIndices: number[]): string {
  return changeKey({ key: '', show: visibleIndices });
}

/*
 * Given two base36 csv visibility keys, returns the indices that have become shown and those that have become
 * hiden. hidden is reversed so that DdgEVManager can collapse the graph inward towaard the focal node, while
 * shown is not reversed so that DdgEVManager can expand the graph outwards from the focal node.
 *
 * @param {object} kwarg - Arguments for changeKey.
 * @param {string} kwarg.oldKey - base36 csv key to serve as baseline.
 * @param {string} kwarg.newKey - base36 csv key to compare to baseline.
 * @returns {object} - Contains shown, an array of indices visible in newKey and not visible in oldKey, and
 *     hiden, an array of indices visible in oldKey and not visible in newKey.
 */
export function compareKeys({
  newKey,
  oldKey,
}: {
  newKey: string;
  oldKey: string;
}): { shown: number[]; hidden: number[] } {
  const shown: number[] = [];
  const hidden: number[] = [];
  const oldBuckets = getBuckets(oldKey);
  const newBuckets = getBuckets(newKey);
  // Go through all buckets, regardless of which key is longer
  for (let i = 0; i < Math.max(oldBuckets.length, newBuckets.length); i++) {
    // Go through all values that can be contained in a given bucket
    for (let j = 0; j < VISIBILITY_BUCKET_SIZE; j++) {
      const visibilityValue = 1 << j;
      const absoluteIndex = i * VISIBILITY_BUCKET_SIZE + j;
      // If the value is in the new bucket and not in the corresponding old bucket, then it was shown.
      if (newBuckets[i] & visibilityValue && !(oldBuckets[i] & visibilityValue)) {
        shown.push(absoluteIndex);
        // If the value is in the old bucket and not in the corresponding new bucket, then it was hidden.
      } else if (oldBuckets[i] & visibilityValue && !(newBuckets[i] & visibilityValue)) {
        hidden.push(absoluteIndex);
      }
    }
  }

  hidden.reverse();
  return { shown, hidden };
}
