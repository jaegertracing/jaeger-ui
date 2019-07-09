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

import { encode, decode } from './visibility-codec';

describe('visibility-codec', () => {
  const sampleLargestEncoded = 'zik0zj,zik0zj';
  const sampleLargestDecoded = [...new Array(62)].map((_undef, i) => i);

  describe('encode', () => {
    it('converts numbers into encoded string', () => {
      expect(encode([0, 1])).toBe('3');
    });

    it('converts numbers greater than 30 into encoded string', () => {
      expect(encode([0, 1, 31])).toBe('3,1');
    });

    it('leaves empty csv entries', () => {
      expect(encode([0, 1, 31, 93])).toBe('3,1,,1');
    });

    it('creates largest possible value in csv', () => {
      expect(encode(sampleLargestDecoded)).toBe(sampleLargestEncoded);
    });
  });

  describe('decode', () => {
    it('converts encoded string into numbers', () => {
      expect(decode('3')).toEqual([0, 1]);
    });

    it('converts encoded string with commas into numbers greater than 31', () => {
      expect(decode('3,1')).toEqual([0, 1, 31]);
    });

    it('handles empty csv entries', () => {
      expect(decode('3,1,,1')).toEqual([0, 1, 31, 93]);
    });

    it('handles largest possible value in csv', () => {
      expect(decode(sampleLargestEncoded)).toEqual(sampleLargestDecoded);
    });
  });
});
