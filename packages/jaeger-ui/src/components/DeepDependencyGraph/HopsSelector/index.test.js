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

import * as React from 'react';
import { shallow } from 'enzyme';

import {
  focalPayloadElem,
  longSimplePath,
  shortPath,
  simplePath,
} from '../../../model/ddg/sample-paths.test.resources';
import transformDdgData from '../../../model/ddg/transformDdgData';
import * as codec from '../../../model/ddg/visibility-codec';
import HopsSelector from '.';

describe('HopsSelector', () => {
  const ddgModel = transformDdgData([longSimplePath, simplePath], focalPayloadElem);
  const shortModel = transformDdgData([shortPath], focalPayloadElem);

  describe('handleClick', () => {
    const updateVisEncoding = () => {};
    let encodeSpy;

    beforeAll(() => {
      encodeSpy = jest.spyOn(codec, 'encode');
    });

    function validateEncoding(start, end, omit) {
      const expectedIndices = [];
      for (let i = start; i <= end; i++) {
        expectedIndices.push(
          ...ddgModel.distanceToPathElems
            .get(i)
            .map(({ visibilityIdx }) => visibilityIdx)
            .filter(idx => !omit || !omit.has(idx))
        );
      }
      const { calls } = encodeSpy.mock;
      expect(new Set(calls[calls.length - 1][0])).toEqual(new Set(expectedIndices));
    }

    describe('without visEncoding', () => {
      const hopsSelector = new HopsSelector({ ddgModel, updateVisEncoding });

      it('removes hops when selecting less than 2 hops', () => {
        hopsSelector.handleClick(-1, -1);
        validateEncoding(-1, 2);
      });

      it('adds hops when selecting more than 2 hops', () => {
        hopsSelector.handleClick(4, 1);
        validateEncoding(-2, 4);
      });

      it('handles selecting 0', () => {
        hopsSelector.handleClick(0, 1);
        validateEncoding(-2, 0);

        hopsSelector.handleClick(0, -1);
        validateEncoding(0, 2);
      });

      it('handles DDGs smaller than two hops', () => {
        const shortSelector = new HopsSelector({ ddgModel: shortModel, updateVisEncoding });
        shortSelector.handleClick(0, -1);
        const { calls } = encodeSpy.mock;
        expect(calls[calls.length - 1][0]).toEqual([0]);
      });

      it('handles out of bounds selection', () => {
        hopsSelector.handleClick(8, 1);
        validateEncoding(-2, 6);
      });
    });

    describe('with visEncoding', () => {
      const fourHops = codec.encode([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
      const fourHopsSelector = new HopsSelector({ ddgModel, updateVisEncoding, visEncoding: fourHops });
      const partialHops = codec.encode([0, 1, 2, 3, 4, 5, 7, 9, 10, 11]);
      const partialHopsSelector = new HopsSelector({ ddgModel, updateVisEncoding, visEncoding: partialHops });

      it('adds hops when selecting more hops', () => {
        fourHopsSelector.handleClick(6, 1);
        validateEncoding(-4, 6);
      });

      it('removes hops when selecting fewer hops', () => {
        fourHopsSelector.handleClick(-2, -1);
        validateEncoding(-2, 4);
      });

      it('handles partially full hops', () => {
        partialHopsSelector.handleClick(4, 1);
        validateEncoding(-3, 4, new Set([8]));
      });

      it('handles selecting 0', () => {
        partialHopsSelector.handleClick(0, 1);
        validateEncoding(-3, 0, new Set([8]));

        partialHopsSelector.handleClick(0, -1);
        validateEncoding(0, 3, new Set([6]));
      });
    });
  });

  describe('render', () => {
    describe('without visEncoding', () => {
      it('renders hops within two hops as full and others as empty', () => {
        const wrapper = shallow(<HopsSelector ddgModel={ddgModel} />);
        expect(wrapper).toMatchSnapshot();
      });

      it('handles DDGs smaller than two hops', () => {
        const wrapper = shallow(<HopsSelector ddgModel={shortModel} />);
        expect(wrapper).toMatchSnapshot();
      });
    });

    describe('with visEncoding', () => {
      it('renders hops with correct fullness', () => {
        const visEncoding = codec.encode([0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13]);
        const wrapper = shallow(<HopsSelector ddgModel={ddgModel} visEncoding={visEncoding} />);
        expect(wrapper).toMatchSnapshot();
      });
    });
  });
});
