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

import { changeVisibility, isVisible } from './visibility-key';

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
  describe('changeVisibility', () => {
    describe('hide', () => {
      it('hides visible value', () => {
        expect(changeVisibility({ visibilityKey: '3', hideIndices: [0] })).toBe('2');
      });

      it('omits value if it becomes entirely invisible', () => {
        expect(changeVisibility({ visibilityKey: '3,1s', hideIndices: [0, 37] })).toBe('2,');
      });
    });

    describe('show', () => {
      it('shows invisible value', () => {
        expect(changeVisibility({ visibilityKey: '', showIndices: [0] })).toBe('1');
      });

      it('retains empty value in CSV', () => {
        expect(changeVisibility({ visibilityKey: ',', showIndices: [0] })).toBe('1,');
      });
    });

    describe('show and hide', () => {
      it('shows and hides values', () => {
        expect(changeVisibility({ visibilityKey: '1', showIndices: [1], hideIndices: [0] })).toBe('2');
      });

      it('shows and hides values across multiple buckets', () => {
        expect(changeVisibility({ visibilityKey: ',1s,', showIndices: [0, 1, 68], hideIndices: [37] })).toBe(
          '3,,1s'
        );
      });

      it('errors when trying to show and hide the same index', () => {
        expect(() =>
          changeVisibility({ visibilityKey: '', showIndices: [0], hideIndices: [0] })
        ).toThrowError();
      });
    });
  });
});
