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

import memoizeOne from 'memoize-one';

const VISIBILITY_BUCKET_SIZE = 31;

const getVisibilityBuckets = memoizeOne((visibilityKey: string): number[] =>
  visibilityKey.split(',').map(partial => parseInt(partial || '0', 36))
);

function convertIdxToBucketValues(visibilityIdx: number) {
  const bucketIdx = Math.floor(visibilityIdx / VISIBILITY_BUCKET_SIZE);
  const digitIdx = visibilityIdx % VISIBILITY_BUCKET_SIZE;
  const visibilityValue = 1 << digitIdx;
  const visibilityCompliment = ~visibilityValue;
  return { bucketIdx, digitIdx, visibilityValue, visibilityCompliment };
}

export function isVisible(visibilityKey: string, visibilityIdx: number): boolean {
  const visibilityBuckets = getVisibilityBuckets(visibilityKey);
  const { bucketIdx, visibilityValue } = convertIdxToBucketValues(visibilityIdx);
  return Boolean(visibilityBuckets[bucketIdx] & visibilityValue);
}

export function changeVisibility({
  visibilityKey,
  showIndices,
  hideIndices,
}: {
  visibilityKey: string;
  showIndices?: number[];
  hideIndices?: number[];
}): string {
  const visibilityBuckets = getVisibilityBuckets(visibilityKey).slice();
  const conflictCheck = new Set(showIndices);

  if (hideIndices) {
    hideIndices.forEach(hideIdx => {
      if (conflictCheck.has(hideIdx)) {
        throw new Error(`Trying to show and hide same visibilityIdx: ${hideIdx} in same change`);
      }
      const { bucketIdx, visibilityCompliment } = convertIdxToBucketValues(hideIdx);
      visibilityBuckets[bucketIdx] &= visibilityCompliment;
    });
  }

  if (showIndices) {
    showIndices.forEach(showIdx => {
      const { bucketIdx, visibilityValue } = convertIdxToBucketValues(showIdx);
      visibilityBuckets[bucketIdx] |= visibilityValue;
    });
  }

  return visibilityBuckets
    .map(bucket => bucket.toString(36))
    .map(value => (value === '0' ? '' : value))
    .join(',');
}
