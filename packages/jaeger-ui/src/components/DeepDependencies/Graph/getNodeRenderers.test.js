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

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import getNodeRenderers from './getNodeRenderers';

import { EViewModifier } from '../../../model/ddg/types';

describe('getNodeRenderers', () => {
  const key = 'test vertex key';
  const lv = {
    vertex: {
      key,
    },
    height: 200,
    width: 100,
  };
  const focalLv = { ...lv, vertex: { key, isFocalNode: true } };

  describe('vectorBorder', () => {
    // Short, DRY way to calculate with (w/) versus (v) without (w/o)
    const wvwo = someBoolean => (someBoolean ? 'with' : 'without');

    [true, false].forEach(findMatch => {
      [true, false].forEach(hovered => {
        [true, false].forEach(pathHovered => {
          [true, false].forEach(focalNode => {
            it(`returns circle ${wvwo(findMatch)} .is-findMatch,\t${wvwo(hovered)} .is-hovered,\t${wvwo(
              pathHovered
            )} .is-pathHovered,\tand ${wvwo(focalNode)} .is-focalNode`, () => {
              const testLv = focalNode ? focalLv : lv;
              const findMatches = new Set(findMatch ? [testLv.vertex.key] : []);
              const vm =
                (hovered ? EViewModifier.Hovered : 0) | (pathHovered ? EViewModifier.PathHovered : 0);
              const vms = new Map([[key, vm]]);
              const { container } = render(getNodeRenderers(findMatches, vms).vectorBorder(testLv));
              const circle = container.querySelector('circle');

              expect(circle).toBeInTheDocument();
              expect(circle).toHaveClass('DdgNode--VectorBorder');
              expect(circle).toHaveAttribute('vector-effect', 'non-scaling-stroke');

              const expectClass = (className, shouldHave) => {
                if (shouldHave) {
                  expect(circle).toHaveClass(className);
                } else {
                  expect(circle).not.toHaveClass(className);
                }
              };

              expectClass('is-findMatch', findMatch);
              expectClass('is-hovered', hovered);
              expectClass('is-pathHovered', pathHovered);
              expectClass('is-focalNode', focalNode);

              // Verify SVG attributes previously covered by snapshot
              // r = width / 2 - 1 => 100 / 2 - 1 = 49
              // cx, cy = width / 2 => 100 / 2 = 50
              expect(circle).toHaveAttribute('r', '49');
              expect(circle).toHaveAttribute('cx', '50');
              expect(circle).toHaveAttribute('cy', '50');
            });
          });
        });
      });
    });
  });

  describe('htmlEmphasis', () => {
    it('returns null if vertex is neither a findMatch nor focalNode', () => {
      expect(getNodeRenderers(new Set(), new Map()).htmlEmphasis(lv)).toBe(null);
    });

    it('returns div with .is-findMatch if vertex is a findMatch', () => {
      const { container } = render(getNodeRenderers(new Set([lv.vertex.key]), new Map()).htmlEmphasis(lv));
      const div = container.querySelector('div');
      expect(div).toBeInTheDocument();
      expect(div).toHaveClass('DdgNode--HtmlEmphasis');
      expect(div).toHaveClass('is-findMatch');
    });

    it('returns div with .is-focalNode if vertex is a focalNode', () => {
      const { container } = render(getNodeRenderers(new Set(), new Map()).htmlEmphasis(focalLv));
      const div = container.querySelector('div');
      expect(div).toBeInTheDocument();
      expect(div).toHaveClass('DdgNode--HtmlEmphasis');
      expect(div).toHaveClass('is-focalNode');
    });

    it('returns div with .is-findMatch and .is-focalNode if vertex is a focalNode and a findMatch', () => {
      const { container } = render(
        getNodeRenderers(new Set([focalLv.vertex.key]), new Map()).htmlEmphasis(focalLv)
      );
      const div = container.querySelector('div');
      expect(div).toBeInTheDocument();
      expect(div).toHaveClass('DdgNode--HtmlEmphasis');
      expect(div).toHaveClass('is-findMatch');
      expect(div).toHaveClass('is-focalNode');
    });
  });

  describe('vectorFindColorBand', () => {
    it('is null if findMatches set is empty', () => {
      expect(getNodeRenderers(new Set(), new Map()).vectorFindColorBand).toBe(null);
    });

    it('returns null if provided vertex is not in set', () => {
      const findMatches = new Set([`not-${key}`]);
      expect(getNodeRenderers(findMatches, new Map()).vectorFindColorBand(lv)).toBe(null);
    });

    it('returns circle with correct size and className', () => {
      const { container } = render(
        getNodeRenderers(new Set([lv.vertex.key]), new Map()).vectorFindColorBand(lv)
      );
      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();

      // Verify specific className and SVG attributes ---
      expect(circle).toHaveClass('DdgNode--VectorFindEmphasis--colorBand');
      // r = width / 2 - 1 => 100 / 2 - 1 = 49
      // cx, cy = width / 2 => 100 / 2 = 50
      expect(circle).toHaveAttribute('r', '49');
      expect(circle).toHaveAttribute('cx', '50');
      expect(circle).toHaveAttribute('cy', '50');
    });
  });
});
