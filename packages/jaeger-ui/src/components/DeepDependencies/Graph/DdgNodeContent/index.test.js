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

jest.mock('./calc-positioning', () => () => ({
  radius: 50,
  svcWidth: 20,
  opWidth: 30,
  svcMarginTop: 10,
}));

/* eslint-disable import/first */
import React from 'react';
import { shallow } from 'enzyme';
import { Checkbox, Popover } from 'antd';

import {
  getNodeRenderer,
  measureNode,
  mapDispatchToProps,
  UnconnectedDdgNodeContent as DdgNodeContent,
} from '.';
import { MAX_LENGTH, MAX_LINKED_TRACES, MIN_LENGTH, PARAM_NAME_LENGTH, RADIUS } from './constants';
import * as track from '../../index.track';
import FilteredList from '../../../common/FilteredList';
import * as getSearchUrl from '../../../SearchTracePage/url';

import { ECheckedStatus, EDdgDensity, EDirection, EViewModifier } from '../../../../model/ddg/types';

describe('<DdgNodeContent>', () => {
  const decorationID = 'test decorationID';
  const decorationValue = 42;
  const operation = 'some-operation';
  const operationArray = ['op0', 'op1', 'op2', 'op3'];
  const service = 'some-service';
  const vertexKey = 'some-key';
  const props = {
    focalNodeUrl: 'some-url',
    focusPathsThroughVertex: jest.fn(),
    getDecoration: jest.fn(),
    getGenerationVisibility: jest.fn(),
    getVisiblePathElems: jest.fn(),
    hideVertex: jest.fn(),
    isFocalNode: false,
    operation,
    selectVertex: jest.fn(),
    setOperation: jest.fn(),
    setViewModifier: jest.fn(),
    service,
    updateGenerationVisibility: jest.fn(),
    vertex: {
      key: vertexKey,
    },
    vertexKey,
  };

  let wrapper;

  beforeEach(() => {
    props.getDecoration.mockClear();
    props.getGenerationVisibility.mockReturnValue(null).mockClear();
    props.getVisiblePathElems.mockReset();
    props.selectVertex.mockReset();
    props.setViewModifier.mockReset();
    props.updateGenerationVisibility.mockReset();
    wrapper = shallow(<DdgNodeContent {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('omits the operation if it is null', () => {
    expect(wrapper).toMatchSnapshot();
    wrapper.setProps({ operation: null });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the number of operations if there are multiple', () => {
    expect(wrapper).toMatchSnapshot();
    wrapper.setProps({ operation: operationArray });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders correctly when isFocalNode = true and focalNodeUrl = null', () => {
    expect(wrapper).toMatchSnapshot();
    wrapper.setProps({ focalNodeUrl: null, isFocalNode: true });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders correctly when given decorationProgressbar', () => {
    expect(wrapper).toMatchSnapshot();

    const decorationProgressbar = <span>Test progressbar</span>;
    wrapper.setProps({ decorationProgressbar, decorationValue });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders correctly when decorationValue is a string', () => {
    expect(wrapper).toMatchSnapshot();

    wrapper.setProps({ decorationValue: 'Error: Status Code 418' });
    expect(wrapper).toMatchSnapshot();
  });

  describe('getDecoration', () => {
    it('gets decoration on mount or change of props.decorationID iff props.decorationID is truthy', () => {
      expect(props.getDecoration).not.toHaveBeenCalled();

      wrapper.setProps({ decorationID });
      expect(props.getDecoration).toHaveBeenCalledTimes(1);
      expect(props.getDecoration).toHaveBeenLastCalledWith(decorationID, service, operation);

      wrapper.setProps({ decorationID });
      expect(props.getDecoration).toHaveBeenCalledTimes(1);

      const newDecorationID = `new ${decorationID}`;
      wrapper.setProps({ decorationID: newDecorationID });
      expect(props.getDecoration).toHaveBeenCalledTimes(2);
      expect(props.getDecoration).toHaveBeenLastCalledWith(newDecorationID, service, operation);

      wrapper.setProps({ decorationID, operation: operationArray });
      expect(props.getDecoration).toHaveBeenCalledTimes(3);
      expect(props.getDecoration).toHaveBeenLastCalledWith(decorationID, service, undefined);

      shallow(<DdgNodeContent {...props} decorationID={decorationID} />);
      expect(props.getDecoration).toHaveBeenCalledTimes(4);
      expect(props.getDecoration).toHaveBeenLastCalledWith(decorationID, service, operation);
    });
  });

  describe('handleClick', () => {
    it('calls props.selectVertex iff props.decorationValue is truthy', () => {
      expect(props.selectVertex).not.toHaveBeenCalled();

      wrapper.find('.DdgNodeContent--core').simulate('click');
      expect(props.selectVertex).not.toHaveBeenCalled();

      wrapper.setProps({ decorationValue });
      wrapper.find('.DdgNodeContent--core').simulate('click');
      expect(props.selectVertex).toHaveBeenCalledTimes(1);
      expect(props.selectVertex).toHaveBeenLastCalledWith(props.vertex);
    });
  });

  describe('measureNode', () => {
    it('returns twice the RADIUS with a buffer for svg border', () => {
      const diameterWithBuffer = 2 * RADIUS + 2;
      expect(measureNode()).toEqual({
        height: diameterWithBuffer,
        width: diameterWithBuffer,
      });
    });
  });

  describe('hover behavior', () => {
    const testIndices = [4, 8, 15, 16, 23, 42];
    const testElems = testIndices.map(visibilityIdx => ({ visibilityIdx }));

    beforeEach(() => {
      props.getVisiblePathElems.mockReturnValue(testElems);
    });

    it('calls setViewModifier on mouse over', () => {
      wrapper.simulate('mouseover', { type: 'mouseover' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(1);
      expect(props.setViewModifier).toHaveBeenCalledWith(testIndices, EViewModifier.Hovered, true);
    });

    it('calls setViewModifier with all modified indices on mouse out', () => {
      wrapper.simulate('mouseover', { type: 'mouseover' });
      wrapper.simulate('mouseout', { type: 'mouseout' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(2);
      expect(props.setViewModifier).toHaveBeenCalledWith(testIndices, EViewModifier.Hovered, false);

      wrapper.simulate('mouseover', { type: 'mouseover' });
      const moreIndices = [108];
      const moreElems = moreIndices.map(visibilityIdx => ({ visibilityIdx }));
      props.getVisiblePathElems.mockReturnValue(moreElems);
      wrapper.simulate('mouseover', { type: 'mouseover' });
      wrapper.simulate('mouseout', { type: 'mouseout' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(5);
      expect(props.setViewModifier).toHaveBeenCalledWith(
        testIndices.concat(moreIndices),
        EViewModifier.Hovered,
        false
      );
    });

    it('calls setViewModifier on unmount iff any indices were hovered and not unhovered', () => {
      wrapper.unmount();
      expect(props.setViewModifier).toHaveBeenCalledTimes(0);

      wrapper = shallow(<DdgNodeContent {...props} />);
      wrapper.simulate('mouseover', { type: 'mouseover' });
      wrapper.simulate('mouseout', { type: 'mouseout' });
      expect(props.setViewModifier).toHaveBeenCalledTimes(2);
      wrapper.unmount();
      expect(props.setViewModifier).toHaveBeenCalledTimes(2);

      wrapper = shallow(<DdgNodeContent {...props} />);
      wrapper.simulate('mouseover', { type: 'mouseover' });
      expect(props.setViewModifier).toHaveBeenCalledTimes(3);
      wrapper.unmount();
      expect(props.setViewModifier).toHaveBeenCalledTimes(4);
      expect(props.setViewModifier).toHaveBeenCalledWith(testIndices, EViewModifier.Hovered, false);
    });

    it('calculates state.childrenVisibility and state.parentVisibility on mouse over', () => {
      const childrenVisibility = ECheckedStatus.Partial;
      const parentVisibility = ECheckedStatus.Full;
      props.getGenerationVisibility.mockImplementation((_key, direction) =>
        direction === EDirection.Upstream ? parentVisibility : childrenVisibility
      );
      wrapper.simulate('mouseover', { type: 'mouseover' });

      expect(wrapper.state()).toEqual({
        childrenVisibility,
        parentVisibility,
      });
    });

    it('handles mouse over event after vis update would hide vertex before unmounting', () => {
      props.getVisiblePathElems.mockReturnValue(undefined);
      wrapper.simulate('mouseover', { type: 'mouseover' });

      expect(wrapper.state()).toEqual({
        childrenVisibility: null,
        parentVisibility: null,
      });
      expect(props.setViewModifier).toHaveBeenCalledWith([], EViewModifier.Hovered, true);
    });

    it('clears hoveredIndices on mouse out', () => {
      wrapper.simulate('mouseover', { type: 'mouseover' });
      expect(wrapper.instance().hoveredIndices).not.toEqual(new Set());
      wrapper.simulate('mouseout', { type: 'mouseout' });
      expect(wrapper.instance().hoveredIndices).toEqual(new Set());
    });
  });

  describe('getNodeRenderer()', () => {
    const ddgVertex = {
      isFocalNode: false,
      key: 'some-key',
      operation: 'the-operation',
      service: 'the-service',
    };
    const noOp = () => {};

    it('returns a <DdgNodeContent />', () => {
      const ddgNode = getNodeRenderer(noOp, noOp, EDdgDensity.PreventPathEntanglement, true, 'testBaseUrl', {
        maxDuration: '100ms',
      })(ddgVertex);
      expect(ddgNode).toBeDefined();
      expect(ddgNode.props).toMatchSnapshot();
    });

    it('returns a focal <DdgNodeContent />', () => {
      const focalNode = getNodeRenderer(
        noOp,
        noOp
      )({
        ...ddgVertex,
        isFocalNode: true,
      });
      expect(focalNode).toBeDefined();
      expect(focalNode.props).toMatchSnapshot();
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        getDecoration: expect.any(Function),
      });
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      jest.spyOn(track, 'trackSetFocus');
      jest.spyOn(track, 'trackViewTraces');
      jest.spyOn(track, 'trackVertexSetOperation');
      jest.spyOn(getSearchUrl, 'getUrl');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('focusPaths', () => {
      it('calls focusPathsThroughVertex with vertexKey', () => {
        wrapper.instance().focusPaths();
        expect(props.focusPathsThroughVertex).toHaveBeenCalledWith(vertexKey);
      });
    });

    describe('hideVertex', () => {
      it('calls hideVertex with vertexKey', () => {
        wrapper.instance().hideVertex();
        expect(props.hideVertex).toHaveBeenCalledWith(vertexKey);
      });
    });

    describe('setOperation', () => {
      it('calls setOperation with the provided operation and tracks the event', () => {
        const newOperation = 'new-operation';
        wrapper.instance().setOperation(newOperation);
        expect(props.setOperation).toHaveBeenCalledWith(newOperation);
        expect(track.trackVertexSetOperation).toHaveBeenCalled();
      });
    });

    describe('updateChildren', () => {
      it('calls updateGenerationVisibility with vertexKey and Downstream direction', () => {
        wrapper.instance().updateChildren();
        expect(props.updateGenerationVisibility).toHaveBeenCalledWith(vertexKey, EDirection.Downstream);
      });
    });

    describe('updateParents', () => {
      it('calls updateGenerationVisibility with vertexKey and Upstream direction', () => {
        wrapper.instance().updateParents();
        expect(props.updateGenerationVisibility).toHaveBeenCalledWith(vertexKey, EDirection.Upstream);
      });
    });

    describe('viewTraces', () => {
      const mockTraceIds = ['trace1', 'trace2', 'trace3'];
      const mockPathElems = [
        { memberOf: { traceIDs: ['trace1'] } },
        { memberOf: { traceIDs: ['trace2'] } },
        { memberOf: { traceIDs: ['trace3'] } },
      ];

      beforeEach(() => {
        props.getVisiblePathElems.mockReturnValue(mockPathElems);
        getSearchUrl.getUrl.mockImplementation(params => `mock-search-url-${params.traceID.join('-')}`);
      });

      it('opens search URL with trace IDs and tracks the event', () => {
        const windowSpy = jest.spyOn(window, 'open').mockImplementation();
        wrapper.instance().viewTraces();

        expect(track.trackViewTraces).toHaveBeenCalled();
        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({ traceID: mockTraceIds });
        expect(windowSpy).toHaveBeenCalledWith('mock-search-url-trace1-trace2-trace3', '_blank');
        windowSpy.mockRestore();
      });

      it('handles case when getVisiblePathElems returns undefined', () => {
        props.getVisiblePathElems.mockReturnValue(undefined);
        const windowSpy = jest.spyOn(window, 'open').mockImplementation();
        wrapper.instance().viewTraces();

        expect(track.trackViewTraces).toHaveBeenCalled();
        expect(getSearchUrl.getUrl).not.toHaveBeenCalled();
        expect(windowSpy).not.toHaveBeenCalled();
        windowSpy.mockRestore();
      });

      it('respects MAX_LINKED_TRACES limit', () => {
        const mockElems = [];
        for (let i = 0; i < MAX_LINKED_TRACES + 5; i++) {
          mockElems.push({
            memberOf: {
              traceIDs: [`trace-${i}`],
            },
          });
        }
        props.getVisiblePathElems.mockReturnValue(mockElems);

        const windowSpy = jest.spyOn(window, 'open').mockImplementation();
        wrapper.instance().viewTraces();

        const expectedTraceIds = mockElems.slice(0, MAX_LINKED_TRACES).map(elem => elem.memberOf.traceIDs[0]);
        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({
          traceID: expectedTraceIds,
        });
        expect(windowSpy).toHaveBeenCalledWith(`mock-search-url-${expectedTraceIds.join('-')}`, '_blank');
        windowSpy.mockRestore();
      });

      it('respects MAX_LENGTH limit', () => {
        const longTraceId = 'a'.repeat(MAX_LENGTH - MIN_LENGTH - PARAM_NAME_LENGTH);
        const shortTraceId = 'b'.repeat(10);

        const mockElems = [
          { memberOf: { traceIDs: [longTraceId] } },
          { memberOf: { traceIDs: [shortTraceId] } },
        ];
        props.getVisiblePathElems.mockReturnValue(mockElems);

        const windowSpy = jest.spyOn(window, 'open').mockImplementation();
        wrapper.instance().viewTraces();

        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({
          traceID: [longTraceId],
        });
        expect(windowSpy).toHaveBeenCalledWith(`mock-search-url-${longTraceId}`, '_blank');
        windowSpy.mockRestore();
      });

      it('handles duplicate trace IDs', () => {
        const traceId = 'duplicate-trace';
        const mockElems = [
          { memberOf: { traceIDs: [traceId] } },
          { memberOf: { traceIDs: [traceId] } },
          { memberOf: { traceIDs: [null, traceId] } },
        ];
        props.getVisiblePathElems.mockReturnValue(mockElems);

        const windowSpy = jest.spyOn(window, 'open').mockImplementation();
        wrapper.instance().viewTraces();

        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({
          traceID: [traceId],
        });
        expect(windowSpy).toHaveBeenCalledWith(`mock-search-url-${traceId}`, '_blank');
        windowSpy.mockRestore();
      });
    });
  });
});
