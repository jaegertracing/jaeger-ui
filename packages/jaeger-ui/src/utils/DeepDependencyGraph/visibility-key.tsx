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

import memoizeOne from 'memoize-one';

const VISIBILITY_KEY_CHUNK_SIZE = 6;
const VISIBILITY_BUCKET_SIZE = 31;

export const getVisibilityBuckets = memoizeOne((visibilityKey: string): number[] => {
  const visibilityBuckets: number[] = [];
  for (let startIdx = 0; startIdx < visibilityKey.length; startIdx += VISIBILITY_KEY_CHUNK_SIZE) {
    const partial = visibilityKey.substring(startIdx, startIdx + VISIBILITY_KEY_CHUNK_SIZE);
    visibilityBuckets.push(parseInt(partial, 36));
  }
  return visibilityBuckets;
});

export function isVisible(visibilityKey: string, visibilityIdx: number): boolean {
  const visibilityBuckets = getVisibilityBuckets(visibilityKey);
  const bucketIdx = Math.floor(visibilityIdx / VISIBILITY_BUCKET_SIZE);
  const digitIdx = visibilityIdx % VISIBILITY_BUCKET_SIZE;
  // console.log(visibilityBuckets, bucketIdx, digitIdx, 1 << digitIdx);
  return Boolean(visibilityBuckets[bucketIdx] & (1 << digitIdx));
}

export function changeVisibility(visibilityKey: string, showIndices: number[], hideIndices: number[]): string {
  const visibilityBuckets = getVisibilityBuckets(visibilityKey).slice();
  const conflictCheck = new Set(showIndices);
  hideIndices.forEach(hideIdx => {
    if (conflictCheck.has(hideIdx)) {
      throw new Error(`Trying to show and hide same visibilityIdx: ${hideIdx} in same change`);
    }
    const bucketIdx = Math.floor(hideIdx / VISIBILITY_BUCKET_SIZE);
    const digitIdx = hideIdx % VISIBILITY_BUCKET_SIZE;
    const enableValue = 1 << digitIdx;
    const disableValue  = ~enableValue;
    visibilityBuckets[bucketIdx] = visibilityBuckets[bucketIdx] & disableValue;
    // visibilityBuckets[bucketIdx] = visibilityBuckets[bucketIdx] | (1 << digitIdx);
  });
  return visibilityBuckets.map(bucket => bucket.toString(36)).join('');
}

