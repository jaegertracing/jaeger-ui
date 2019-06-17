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

import { compareKeys, changeKey, isVisible } from './visibility-key';

describe('visibility-key', () => {
  describe('isVisible', () => {
    it('returns false for an empty key', () => {
      expect(isVisible('', 0)).toBe(false);
    });

    it('returns false if corresponding value is false', () => {
      expect(isVisible('0', 1)).toBe(false);
    });

    it('returns false if visibilityIdx is out of bounds', () => {
      expect(isVisible('zzzzzz', 32)).toBe(false);
    });

    it('returns true iff corresponding value is true', () => {
      expect(isVisible('1', 0)).toBe(true);
      expect(isVisible('1', 1)).toBe(false);
      expect(isVisible('1', 37)).toBe(false);

      expect(isVisible('2', 0)).toBe(false);
      expect(isVisible('2', 1)).toBe(true);
      expect(isVisible('2', 37)).toBe(false);

      expect(isVisible(',1s', 0)).toBe(false);
      expect(isVisible(',1s', 1)).toBe(false);
      expect(isVisible(',1s', 37)).toBe(true);

      expect(isVisible('3,1s', 0)).toBe(true);
      expect(isVisible('3,1s', 1)).toBe(true);
      expect(isVisible('3,1s', 37)).toBe(true);
    });
  });

  describe('changeKey', () => {
    describe('hide', () => {
      it('hides visible value', () => {
        expect(changeKey({ key: '3', hide: [0] })).toBe('2');
      });

      it('omits value if it becomes entirely invisible', () => {
        expect(changeKey({ key: '3,1s', hide: [0, 37] })).toBe('2,');
      });
    });

    describe('show', () => {
      it('shows invisible value', () => {
        expect(changeKey({ key: '0', show: [0] })).toBe('1');
      });

      it('retains empty value in CSV', () => {
        expect(changeKey({ key: ',', show: [0] })).toBe('1,');
      });
    });

    describe('show and hide', () => {
      it('shows and hides values', () => {
        expect(changeKey({ key: '1', show: [1], hide: [0] })).toBe('2');
      });

      it('shows and hides values across multiple buckets', () => {
        expect(changeKey({ key: ',1s,', show: [0, 1, 68], hide: [37] })).toBe('3,,1s');
      });

      it('errors when trying to show and hide the same index', () => {
        expect(() => changeKey({ key: '', show: [0], hide: [0] })).toThrowError();
      });
    });
  });

  describe('compareKeys', () => {
    describe('shown', () => {
      it('returns a new value', () => {
        expect(compareKeys({ newKey: '3', oldKey: '1,1' }).shown).toEqual([1]);
      });

      it('returns multiple new values in ascending order', () => {
        expect(compareKeys({ newKey: '7', oldKey: '2' }).shown).toEqual([0, 2]);
      });

      it('returns multiple new values accross multiple buckets', () => {
        expect(compareKeys({ newKey: '7,1t,4', oldKey: '2,1' }).shown).toEqual([0, 2, 37, 64]);
      });
    });

    describe('hidden', () => {
      it('returns a hidden value', () => {
        expect(compareKeys({ newKey: '1,1', oldKey: '3' }).hidden).toEqual([1]);
      });

      it('returns multiple hidden values in descending order', () => {
        expect(compareKeys({ newKey: '2', oldKey: '7' }).hidden).toEqual([2, 0]);
      });

      it('returns multiple new values across multiple buckets', () => {
        expect(compareKeys({ newKey: '2,1', oldKey: '7,1t,4' }).hidden).toEqual([64, 37, 2, 0]);
      });
    });

    describe('shown and hidden', () => {
      it('returns shown and hidden values', () => {
        expect(compareKeys({ newKey: '6', oldKey: '5' })).toEqual({
          shown: [1],
          hidden: [0],
        });
      });

      it('returns shown and hidden values across multiple buckets', () => {
        expect(compareKeys({ newKey: '6,1,,,1,', oldKey: '5,,1,1,,' })).toEqual({
          shown: [1, 31, 124],
          hidden: [93, 62, 0],
        });
      });
    });
  });
});
