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

  describe('node interactions', () => {
    describe('focusPaths', () => {
      beforeEach(() => {
        props.focusPathsThroughVertex.mockReset();
      });

      it('calls this.props.focusPathsThroughVertex with this.props.vertexKey', () => {
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(2)
          .simulate('click');

        expect(props.focusPathsThroughVertex).toHaveBeenCalledWith(props.vertexKey);
        expect(props.focusPathsThroughVertex).toHaveBeenCalledTimes(1);
      });
    });

    describe('hideVertex', () => {
      beforeEach(() => {
        props.hideVertex.mockReset();
      });

      it('calls this.props.hideVertex with this.props.vertexKey', () => {
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(3)
          .simulate('click');

        expect(props.hideVertex).toHaveBeenCalledWith(props.vertexKey);
        expect(props.hideVertex).toHaveBeenCalledTimes(1);
      });
    });

    describe('setFocus', () => {
      let trackSetFocusSpy;

      beforeAll(() => {
        trackSetFocusSpy = jest.spyOn(track, 'trackSetFocus');
      });

      it('tracks when setFocus link is clicked', () => {
        expect(trackSetFocusSpy).toHaveBeenCalledTimes(0);
        wrapper.find(`[href="${props.focalNodeUrl}"]`).simulate('click');
        expect(trackSetFocusSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('setOperation', () => {
      let trackSetOpSpy;

      beforeAll(() => {
        trackSetOpSpy = jest.spyOn(track, 'trackVertexSetOperation');
      });

      it('tracks when popover sets a value', () => {
        wrapper.setProps({ operation: operationArray });
        expect(trackSetOpSpy).not.toHaveBeenCalled();

        const list = shallow(<div>{wrapper.find(Popover).prop('content')}</div>).find(FilteredList);
        expect(list.prop('options')).toBe(operationArray);
        expect(trackSetOpSpy).not.toHaveBeenCalled();

        list.prop('setValue')(operationArray[operationArray.length - 1]);
        expect(props.setOperation).toHaveBeenCalledWith(operationArray[operationArray.length - 1]);
        expect(trackSetOpSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateChildren', () => {
      it('renders children visibility status indicator iff state.childrenVisibility is provided', () => {
        const initialItemCount = wrapper.find('.DdgNodeContent--actionsItem').length;

        wrapper.setState({ childrenVisibility: ECheckedStatus.Empty });
        expect(wrapper.find('.DdgNodeContent--actionsItem').length).toBe(initialItemCount + 1);
        expect(wrapper.find(Checkbox).props()).toEqual(
          expect.objectContaining({
            checked: false,
            indeterminate: false,
          })
        );

        wrapper.setState({ childrenVisibility: ECheckedStatus.Partial });
        expect(wrapper.find('.DdgNodeContent--actionsItem').length).toBe(initialItemCount + 1);
        expect(wrapper.find(Checkbox).props()).toEqual(
          expect.objectContaining({
            checked: false,
            indeterminate: true,
          })
        );

        wrapper.setState({ childrenVisibility: ECheckedStatus.Full });
        expect(wrapper.find('.DdgNodeContent--actionsItem').length).toBe(initialItemCount + 1);
        expect(wrapper.find(Checkbox).props()).toEqual(
          expect.objectContaining({
            checked: true,
            indeterminate: false,
          })
        );
      });

      it('calls this.props.updateGenerationVisibility with this.props.vertexKey', () => {
        wrapper.setState({ childrenVisibility: ECheckedStatus.Empty });
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .last()
          .simulate('click');

        expect(props.updateGenerationVisibility).toHaveBeenCalledWith(props.vertexKey, EDirection.Downstream);
        expect(props.updateGenerationVisibility).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateParents', () => {
      it('renders parent visibility status indicator iff state.parentVisibility is provided', () => {
        const initialItemCount = wrapper.find('.DdgNodeContent--actionsItem').length;

        wrapper.setState({ parentVisibility: ECheckedStatus.Empty });
        expect(wrapper.find('.DdgNodeContent--actionsItem').length).toBe(initialItemCount + 1);
        expect(wrapper.find(Checkbox).props()).toEqual(
          expect.objectContaining({
            checked: false,
            indeterminate: false,
          })
        );

        wrapper.setState({ parentVisibility: ECheckedStatus.Partial });
        expect(wrapper.find('.DdgNodeContent--actionsItem').length).toBe(initialItemCount + 1);
        expect(wrapper.find(Checkbox).props()).toEqual(
          expect.objectContaining({
            checked: false,
            indeterminate: true,
          })
        );

        wrapper.setState({ parentVisibility: ECheckedStatus.Full });
        expect(wrapper.find('.DdgNodeContent--actionsItem').length).toBe(initialItemCount + 1);
        expect(wrapper.find(Checkbox).props()).toEqual(
          expect.objectContaining({
            checked: true,
            indeterminate: false,
          })
        );
      });

      it('calls this.props.updateGenerationVisibility with this.props.vertexKey', () => {
        wrapper.setState({ parentVisibility: ECheckedStatus.Empty });
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .last()
          .simulate('click');

        expect(props.updateGenerationVisibility).toHaveBeenCalledWith(props.vertexKey, EDirection.Upstream);
        expect(props.updateGenerationVisibility).toHaveBeenCalledTimes(1);
      });
    });

    describe('viewTraces', () => {
      const click = () =>
        wrapper
          .find('.DdgNodeContent--actionsItem')
          .at(1)
          .simulate('click');
      const pad = num => `000${num}`.slice(-4);
      const mockReturn = ids =>
        props.getVisiblePathElems.mockReturnValue(ids.map(traceIDs => ({ memberOf: { traceIDs } })));
      const calcIdxWithinLimit = arr => Math.floor(0.75 * arr.length);
      const falsifyDuplicateAndMock = ids => {
        const withFalsyAndDuplicate = ids.map(arr => arr.slice());
        withFalsyAndDuplicate[0].splice(
          calcIdxWithinLimit(withFalsyAndDuplicate[0]),
          0,
          withFalsyAndDuplicate[1][calcIdxWithinLimit(withFalsyAndDuplicate[1])],
          ''
        );
        withFalsyAndDuplicate[1].splice(
          calcIdxWithinLimit(withFalsyAndDuplicate[1]),
          0,
          withFalsyAndDuplicate[0][calcIdxWithinLimit(withFalsyAndDuplicate[0])],
          ''
        );
        mockReturn(withFalsyAndDuplicate);
      };
      const makeIDsAndMock = (idCounts, makeID = count => `test traceID${count}`) => {
        let idCount = 0;
        const ids = idCounts.map(count => {
          const rv = [];
          for (let i = 0; i < count; i++) {
            rv.push(makeID(pad(idCount++)));
          }
          return rv;
        });
        mockReturn(ids);
        return ids;
      };
      let getSearchUrlSpy;
      let trackViewTracesSpy;
      const verifyLastIDs = expectedIDs => {
        const getSearchUrlCallCount = getSearchUrlSpy.mock.calls.length;
        const actualIDs = getSearchUrlSpy.mock.calls[getSearchUrlCallCount - 1][0].traceID;

        expect(actualIDs.sort()).toEqual(expectedIDs.sort());
        expect(trackViewTracesSpy).toHaveBeenCalledTimes(getSearchUrlCallCount);
      };
      let originalOpen;

      beforeAll(() => {
        originalOpen = window.open;
        window.open = jest.fn();
        getSearchUrlSpy = jest.spyOn(getSearchUrl, 'getUrl');
        trackViewTracesSpy = jest.spyOn(track, 'trackViewTraces');
      });

      beforeEach(() => {
        getSearchUrlSpy.mockClear();
        window.open.mockReset();
        trackViewTracesSpy.mockReset();
      });

      afterAll(() => {
        window.open = originalOpen;
      });

      it('no-ops if there are no elems for key', () => {
        props.getVisiblePathElems.mockReturnValue();
        click();
        expect(window.open).not.toHaveBeenCalled();
      });

      it('opens new tab viewing single traceID from single elem', () => {
        const ids = makeIDsAndMock([1]);
        click();

        verifyLastIDs([].concat(...ids));
        expect(props.getVisiblePathElems).toHaveBeenCalledTimes(1);
        expect(props.getVisiblePathElems).toHaveBeenCalledWith(vertexKey);
      });

      it('opens new tab viewing multiple traceIDs from single elem', () => {
        const ids = makeIDsAndMock([3]);
        click();

        verifyLastIDs([].concat(...ids));
      });

      it('opens new tab viewing multiple traceIDs from multiple elems', () => {
        const ids = makeIDsAndMock([3, 2]);
        click();

        verifyLastIDs([].concat(...ids));
      });

      it('ignores falsy and duplicate IDs', () => {
        const ids = makeIDsAndMock([3, 3]);
        falsifyDuplicateAndMock(ids);
        click();

        verifyLastIDs([].concat(...ids));
      });

      describe('MAX_LINKED_TRACES', () => {
        const ids = makeIDsAndMock([MAX_LINKED_TRACES, MAX_LINKED_TRACES, 1]);
        const expected = [
          ...ids[0].slice(MAX_LINKED_TRACES / 2 + 1),
          ...ids[1].slice(MAX_LINKED_TRACES / 2 + 1),
          ids[2][0],
        ].sort();

        it('limits link to only include MAX_LINKED_TRACES, taking equal from each pathElem', () => {
          mockReturn(ids);
          click();

          verifyLastIDs(expected);
        });

        it('does not count falsy and duplicate IDs towards MAX_LINKED_TRACES', () => {
          falsifyDuplicateAndMock(ids);
          click();

          verifyLastIDs(expected);
        });
      });

      describe('MAX_LENGTH', () => {
        const effectiveMaxLength = MAX_LENGTH - MIN_LENGTH;
        const TARGET_ID_COUNT = 31;
        const paddingLength = Math.floor(effectiveMaxLength / TARGET_ID_COUNT) - PARAM_NAME_LENGTH;
        const idPadding = 'x'.repeat(paddingLength - pad(0).length);
        const ids = makeIDsAndMock([TARGET_ID_COUNT, TARGET_ID_COUNT, 1], num => `${idPadding}${num}`);
        const expected = [
          ...ids[0].slice(TARGET_ID_COUNT / 2 + 1),
          ...ids[1].slice(TARGET_ID_COUNT / 2 + 1),
          ids[2][0],
        ].sort();

        it('limits link to only include MAX_LENGTH, taking equal from each pathElem', () => {
          mockReturn(ids);
          click();

          verifyLastIDs(expected);
        });

        it('does not count falsy and duplicate IDs towards MAX_LEN', () => {
          falsifyDuplicateAndMock(ids);
          click();

          verifyLastIDs(expected);
        });
      });
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
      const focalNode = getNodeRenderer(noOp, noOp)({
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
});
