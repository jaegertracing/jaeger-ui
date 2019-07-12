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
    const updateVisEncoding = jest.fn();
    const visEncoding = '3';
    const mockNewEncoding = '1';
    let encodeDistanceSpy;

    beforeAll(() => {
      encodeDistanceSpy = jest.spyOn(codec, 'encodeDistance').mockImplementation(() => mockNewEncoding);
    });

    it('calls props.updateVisEncoding with result of encodeDistance', () => {
      const hopsSelector = new HopsSelector({ ddgModel, updateVisEncoding, visEncoding });
      const distance = -3;
      const direction = -1;
      hopsSelector.handleClick(distance, direction);
      expect(encodeDistanceSpy).toHaveBeenLastCalledWith({
        ddgModel,
        direction,
        distance,
        prevVisEncoding: visEncoding,
      });
      expect(updateVisEncoding).toHaveBeenLastCalledWith(mockNewEncoding);
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
