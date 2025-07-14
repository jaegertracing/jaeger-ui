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

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  getNodeRenderer,
  measureNode,
  mapDispatchToProps,
  UnconnectedDdgNodeContent as DdgNodeContent,
} from '.';
import { MAX_LENGTH, MAX_LINKED_TRACES, MIN_LENGTH, PARAM_NAME_LENGTH, RADIUS } from './constants';
import * as track from '../../index.track';
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
    isPositioned: true,
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

  beforeEach(() => {
    props.getDecoration.mockClear();
    props.getGenerationVisibility.mockReturnValue(null).mockClear();
    props.getVisiblePathElems.mockReset();
    props.selectVertex.mockReset();
    props.setViewModifier.mockReset();
    props.updateGenerationVisibility.mockReset();
  });

  it('does not explode', () => {
    const { container } = render(<DdgNodeContent {...props} />);
    expect(container).toBeInTheDocument();
  });

  it('omits the operation if it is null', () => {
    const { rerender, container } = render(<DdgNodeContent {...props} />);
    expect(screen.getByText(/operation/i)).toBeInTheDocument();

    rerender(<DdgNodeContent {...props} operation={null} />);
    expect(screen.queryByText(/operation/i)).not.toBeInTheDocument();
  });

  it('renders the number of operations if there are multiple', () => {
    const { rerender } = render(<DdgNodeContent {...props} />);
    expect(screen.getByText(/operation/i)).toBeInTheDocument();

    rerender(<DdgNodeContent {...props} operation={operationArray} />);
    expect(screen.getByText('4 Operations')).toBeInTheDocument();
  });

  it('renders correctly when isFocalNode = true and focalNodeUrl = null', () => {
    const { rerender, container } = render(<DdgNodeContent {...props} />);
    const nodeCore = container.querySelector('.DdgNodeContent--core');
    expect(nodeCore).not.toHaveClass('is-focalNode');

    rerender(<DdgNodeContent {...props} focalNodeUrl={null} isFocalNode />);
    expect(nodeCore).toHaveClass('is-focalNode');
  });

  it('renders correctly when given decorationProgressbar', () => {
    const decorationProgressbar = <div data-testid="test-progressbar">Test progressbar</div>;

    const { rerender, container } = render(<DdgNodeContent {...props} />);
    expect(screen.queryByTestId('test-progressbar')).not.toBeInTheDocument();

    rerender(
      <DdgNodeContent
        {...props}
        decorationProgressbar={decorationProgressbar}
        decorationValue={decorationValue}
      />
    );
    expect(screen.getByTestId('test-progressbar')).toBeInTheDocument();
    const nodeCore = container.querySelector('.DdgNodeContent--core');
    expect(nodeCore).toHaveClass('is-decorated');
  });

  it('renders correctly when decorationValue is a string', () => {
    const { rerender, container } = render(<DdgNodeContent {...props} />);
    const nodeCore = container.querySelector('.DdgNodeContent--core');
    expect(nodeCore).not.toHaveClass('is-missingDecoration');

    rerender(<DdgNodeContent {...props} decorationValue="Error: Status Code 418" />);
    expect(nodeCore).toHaveClass('is-missingDecoration');
  });

  describe('getDecoration', () => {
    it('gets decoration on mount or change of props.decorationID iff props.decorationID is truthy', () => {
      expect(props.getDecoration).not.toHaveBeenCalled();

      const { rerender } = render(<DdgNodeContent {...props} decorationID={decorationID} />);
      expect(props.getDecoration).toHaveBeenCalledTimes(1);
      expect(props.getDecoration).toHaveBeenLastCalledWith(decorationID, service, operation);

      rerender(<DdgNodeContent {...props} decorationID={decorationID} />);
      expect(props.getDecoration).toHaveBeenCalledTimes(1);

      const newDecorationID = `new ${decorationID}`;
      rerender(<DdgNodeContent {...props} decorationID={newDecorationID} />);
      expect(props.getDecoration).toHaveBeenCalledTimes(2);
      expect(props.getDecoration).toHaveBeenLastCalledWith(newDecorationID, service, operation);

      rerender(<DdgNodeContent {...props} decorationID={decorationID} operation={operationArray} />);
      expect(props.getDecoration).toHaveBeenCalledTimes(3);
      expect(props.getDecoration).toHaveBeenLastCalledWith(decorationID, service, undefined);

      render(<DdgNodeContent {...props} decorationID={decorationID} />);
      expect(props.getDecoration).toHaveBeenCalledTimes(4);
      expect(props.getDecoration).toHaveBeenLastCalledWith(decorationID, service, operation);
    });
  });

  describe('handleClick', () => {
    it('calls props.selectVertex iff props.decorationValue is truthy', () => {
      expect(props.selectVertex).not.toHaveBeenCalled();

      const { rerender, container } = render(<DdgNodeContent {...props} />);
      fireEvent.click(container.querySelector('.DdgNodeContent--core'));
      expect(props.selectVertex).not.toHaveBeenCalled();

      rerender(<DdgNodeContent {...props} decorationValue={decorationValue} />);
      fireEvent.click(container.querySelector('.DdgNodeContent--core'));
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
      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');
      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(1);
      expect(props.setViewModifier).toHaveBeenCalledWith(testIndices, EViewModifier.Hovered, true);
    });

    it('calls setViewModifier with all modified indices on mouse out', () => {
      const { unmount, container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');

      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });
      fireEvent.mouseOut(nodeContent, { type: 'mouseout' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(2);
      expect(props.setViewModifier).toHaveBeenCalledWith(testIndices, EViewModifier.Hovered, false);

      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });
      const moreIndices = [108];
      const moreElems = moreIndices.map(visibilityIdx => ({ visibilityIdx }));
      props.getVisiblePathElems.mockReturnValue(moreElems);
      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });
      fireEvent.mouseOut(nodeContent, { type: 'mouseout' });

      expect(props.setViewModifier).toHaveBeenCalledTimes(5);
      expect(props.setViewModifier).toHaveBeenCalledWith(
        testIndices.concat(moreIndices),
        EViewModifier.Hovered,
        false
      );
    });

    it('calls setViewModifier on unmount iff any indices were hovered and not unhovered', () => {
      const { unmount } = render(<DdgNodeContent {...props} />);
      unmount();
      expect(props.setViewModifier).toHaveBeenCalledTimes(0);

      const { unmount: unmount2, container: container2 } = render(<DdgNodeContent {...props} />);
      const nodeContent2 = container2.querySelector('.DdgNodeContent');
      fireEvent.mouseOver(nodeContent2, { type: 'mouseover' });
      fireEvent.mouseOut(nodeContent2, { type: 'mouseout' });
      expect(props.setViewModifier).toHaveBeenCalledTimes(2);
      unmount2();
      expect(props.setViewModifier).toHaveBeenCalledTimes(2);

      const { unmount: unmount3, container: container3 } = render(<DdgNodeContent {...props} />);
      const nodeContent3 = container3.querySelector('.DdgNodeContent');
      fireEvent.mouseOver(nodeContent3, { type: 'mouseover' });
      expect(props.setViewModifier).toHaveBeenCalledTimes(3);
      unmount3();
      expect(props.setViewModifier).toHaveBeenCalledTimes(4);
      expect(props.setViewModifier).toHaveBeenCalledWith(testIndices, EViewModifier.Hovered, false);
    });

    it('calculates state.childrenVisibility and state.parentVisibility on mouse over', () => {
      const childrenVisibility = ECheckedStatus.Partial;
      const parentVisibility = ECheckedStatus.Full;
      props.getGenerationVisibility.mockImplementation((_key, direction) =>
        direction === EDirection.Upstream ? parentVisibility : childrenVisibility
      );

      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');
      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      expect(props.getGenerationVisibility).toHaveBeenCalledWith(vertexKey, EDirection.Upstream);
      expect(props.getGenerationVisibility).toHaveBeenCalledWith(vertexKey, EDirection.Downstream);
    });

    it('handles mouse over event after vis update would hide vertex before unmounting', () => {
      props.getVisiblePathElems.mockReturnValue(undefined);
      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');
      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      expect(props.setViewModifier).toHaveBeenCalledWith([], EViewModifier.Hovered, true);
    });

    it('clears hoveredIndices on mouse out', () => {
      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');

      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });
      expect(props.setViewModifier).toHaveBeenCalledTimes(1);

      fireEvent.mouseOut(nodeContent, { type: 'mouseout' });

      props.getVisiblePathElems.mockReturnValue([{ visibilityIdx: 999 }]);
      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      expect(props.setViewModifier).toHaveBeenLastCalledWith([999], EViewModifier.Hovered, true);
    });
  });

  describe('tooltip positioning', () => {
    let mockGetBoundingClientRect;
    let mockQuerySelector;

    beforeEach(() => {
      mockGetBoundingClientRect = jest.fn(() => ({
        top: 100,
        bottom: 200,
        left: 50,
        right: 150,
        width: 100,
        height: 100,
      }));

      mockQuerySelector = jest.fn(selector => {
        if (selector === '.DdgHeader--controlHeader') {
          return {
            getBoundingClientRect: () => ({
              top: 0,
              bottom: 80,
              left: 0,
              right: 1000,
              width: 1000,
              height: 80,
            }),
          };
        }
        return null;
      });

      Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
      document.querySelector = mockQuerySelector;

      jest.spyOn(global, 'setTimeout').mockImplementation(fn => fn());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('positions tooltip below when node is near header', () => {
      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');

      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      const tooltip = container.querySelector('.DdgNodeContent--actionsWrapper-below');
      expect(tooltip).toBeInTheDocument();
    });

    it('positions tooltip above when node is far from header', () => {
      mockGetBoundingClientRect.mockReturnValue({
        top: 400,
        bottom: 500,
        left: 50,
        right: 150,
        width: 100,
        height: 100,
      });

      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');

      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      const tooltip = container.querySelector('.DdgNodeContent--actionsWrapper-below');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('handles case when header element is not found', () => {
      mockQuerySelector.mockReturnValue(null);
      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');

      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      const tooltip = container.querySelector('.DdgNodeContent--actionsWrapper-below');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('handles case when node ref is not available', () => {
      const instance = new DdgNodeContent(props);
      instance.nodeRef = { current: null };
      mockQuerySelector.mockClear();

      expect(() => {
        instance.checkTooltipPosition();
      }).not.toThrow();

      expect(mockQuerySelector).not.toHaveBeenCalled();
    });

    it('does not update state when tooltip position has not changed', () => {
      const instance = new DdgNodeContent(props);
      instance.nodeRef = {
        current: {
          getBoundingClientRect: () => ({
            top: 100,
            bottom: 200,
            left: 50,
            right: 150,
            width: 100,
            height: 100,
          }),
        },
      };

      // set initial state directly (not using setState on unmounted component)
      instance.state = { shouldPositionTooltipBelow: true };

      // Spy on setState
      const setStateSpy = jest.spyOn(instance, 'setState');

      // call checkTooltipPosition with same conditions that would result in true
      instance.checkTooltipPosition();

      // setState should not be called since position hasn't changed (still true)
      expect(setStateSpy).not.toHaveBeenCalled();

      setStateSpy.mockRestore();
    });

    it('does not check position when already determined on subsequent hovers', () => {
      const { container } = render(<DdgNodeContent {...props} />);
      const nodeContent = container.querySelector('.DdgNodeContent');

      // First hover to determine position
      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      // clear mock calls
      mockQuerySelector.mockClear();

      // mouse out and hover again
      fireEvent.mouseOut(nodeContent, { type: 'mouseout' });
      fireEvent.mouseOver(nodeContent, { type: 'mouseover' });

      // checkTooltipPosition should not be called again
      expect(mockQuerySelector).not.toHaveBeenCalledWith('.DdgHeader--controlHeader');
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
      const renderNode = getNodeRenderer({
        baseUrl: 'testBaseUrl',
        density: EDdgDensity.PreventPathEntanglement,
        extraUrlArgs: { maxDuration: '100ms' },
        focusPathsThroughVertex: noOp,
        getGenerationVisibility: noOp,
        getVisiblePathElems: noOp,
        hideVertex: noOp,
        selectVertex: noOp,
        setOperation: noOp,
        setViewModifier: noOp,
        updateGenerationVisibility: noOp,
      });

      const node = renderNode(ddgVertex, null, {});
      expect(node).toBeDefined();
      expect(node.props.service).toBe(ddgVertex.service);
      expect(node.props.operation).toBe(ddgVertex.operation);
      expect(node.props.isPositioned).toBe(true);
    });

    it('returns a focal <DdgNodeContent />', () => {
      const renderNode = getNodeRenderer({
        baseUrl: 'testBaseUrl',
        density: EDdgDensity.PreventPathEntanglement,
        extraUrlArgs: {},
        focusPathsThroughVertex: noOp,
        getGenerationVisibility: noOp,
        getVisiblePathElems: noOp,
        hideVertex: noOp,
        selectVertex: noOp,
        setOperation: noOp,
        setViewModifier: noOp,
        updateGenerationVisibility: noOp,
      });

      const focalVertex = {
        ...ddgVertex,
        isFocalNode: true,
      };

      const node = renderNode(focalVertex, null, {});
      expect(node).toBeDefined();
      expect(node.props.isFocalNode).toBe(true);
      expect(node.props.focalNodeUrl).toBe(null);
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
      jest.spyOn(window, 'open').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('focusPaths', () => {
      it('calls focusPathsThroughVertex with vertexKey', () => {
        const { container } = render(<DdgNodeContent {...props} />);

        const actionItems = container.querySelectorAll('.NodeContent--actionsItem');
        const focusPathsAction = Array.from(actionItems).find(item =>
          item.textContent.includes('Focus paths through this node')
        );

        fireEvent.click(focusPathsAction);

        expect(props.focusPathsThroughVertex).toHaveBeenCalledWith(vertexKey);
      });
    });

    describe('hideVertex', () => {
      it('calls hideVertex with vertexKey', () => {
        const { container } = render(<DdgNodeContent {...props} />);

        const actionItems = container.querySelectorAll('.NodeContent--actionsItem');
        const hideNodeAction = Array.from(actionItems).find(item => item.textContent.includes('Hide node'));

        fireEvent.click(hideNodeAction);

        expect(props.hideVertex).toHaveBeenCalledWith(vertexKey);
      });
    });

    describe('setOperation', () => {
      it('calls setOperation with the provided operation and tracks the event', () => {
        const instance = new DdgNodeContent(props);
        const newOperation = 'op1';
        instance.setOperation(newOperation);

        expect(props.setOperation).toHaveBeenCalledWith(newOperation);
        expect(track.trackVertexSetOperation).toHaveBeenCalled();
      });
    });

    describe('updateChildren', () => {
      it('calls updateGenerationVisibility with vertexKey and Downstream direction', () => {
        const instance = new DdgNodeContent(props);
        instance.updateChildren();

        expect(props.updateGenerationVisibility).toHaveBeenCalledWith(vertexKey, EDirection.Downstream);
      });
    });

    describe('updateParents', () => {
      it('calls updateGenerationVisibility with vertexKey and Upstream direction', () => {
        const instance = new DdgNodeContent(props);
        instance.updateParents();

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
        const { container } = render(<DdgNodeContent {...props} />);

        const actionItems = container.querySelectorAll('.NodeContent--actionsItem');
        const viewTracesAction = Array.from(actionItems).find(item =>
          item.textContent.includes('View traces')
        );

        fireEvent.click(viewTracesAction);

        expect(track.trackViewTraces).toHaveBeenCalled();
        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({ traceID: mockTraceIds });
        expect(window.open).toHaveBeenCalledWith('mock-search-url-trace1-trace2-trace3', '_blank');
      });

      it('handles case when getVisiblePathElems returns undefined', () => {
        props.getVisiblePathElems.mockReturnValue(undefined);

        const { container } = render(<DdgNodeContent {...props} />);

        const actionItems = container.querySelectorAll('.NodeContent--actionsItem');
        const viewTracesAction = Array.from(actionItems).find(item =>
          item.textContent.includes('View traces')
        );

        fireEvent.click(viewTracesAction);

        expect(track.trackViewTraces).toHaveBeenCalled();
        expect(getSearchUrl.getUrl).not.toHaveBeenCalled();
        expect(window.open).not.toHaveBeenCalled();
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

        const { container } = render(<DdgNodeContent {...props} />);

        const actionItems = container.querySelectorAll('.NodeContent--actionsItem');
        const viewTracesAction = Array.from(actionItems).find(item =>
          item.textContent.includes('View traces')
        );

        fireEvent.click(viewTracesAction);

        const expectedTraceIds = [];
        for (let i = 0; i < MAX_LINKED_TRACES; i++) {
          expectedTraceIds.push(`trace-${i}`);
        }

        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({
          traceID: expectedTraceIds,
        });
        expect(window.open).toHaveBeenCalledWith(`mock-search-url-${expectedTraceIds.join('-')}`, '_blank');
      });

      it('respects MAX_LENGTH limit', () => {
        const longTraceId = 'a'.repeat(MAX_LENGTH - MIN_LENGTH - PARAM_NAME_LENGTH);
        const shortTraceId = 'b'.repeat(10);

        const mockElems = [
          { memberOf: { traceIDs: [longTraceId] } },
          { memberOf: { traceIDs: [shortTraceId] } },
        ];
        props.getVisiblePathElems.mockReturnValue(mockElems);

        const { container } = render(<DdgNodeContent {...props} />);

        const actionItems = container.querySelectorAll('.NodeContent--actionsItem');
        const viewTracesAction = Array.from(actionItems).find(item =>
          item.textContent.includes('View traces')
        );

        fireEvent.click(viewTracesAction);

        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({
          traceID: [longTraceId],
        });
        expect(window.open).toHaveBeenCalledWith(`mock-search-url-${longTraceId}`, '_blank');
      });

      it('handles duplicate trace IDs', () => {
        const traceId = 'duplicate-trace';
        const mockElems = [
          { memberOf: { traceIDs: [traceId] } },
          { memberOf: { traceIDs: [traceId] } },
          { memberOf: { traceIDs: [null, traceId] } },
        ];
        props.getVisiblePathElems.mockReturnValue(mockElems);

        const { container } = render(<DdgNodeContent {...props} />);

        const actionItems = container.querySelectorAll('.NodeContent--actionsItem');
        const viewTracesAction = Array.from(actionItems).find(item =>
          item.textContent.includes('View traces')
        );

        fireEvent.click(viewTracesAction);

        expect(getSearchUrl.getUrl).toHaveBeenCalledWith({
          traceID: [traceId],
        });
        expect(window.open).toHaveBeenCalledWith(`mock-search-url-${traceId}`, '_blank');
      });
    });
  });
});
