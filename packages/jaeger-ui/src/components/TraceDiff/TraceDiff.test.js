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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import queryString from 'query-string';
import * as redux from 'redux';

import { mapStateToProps, mapDispatchToProps, TraceDiffImpl } from './TraceDiff';
import * as TraceDiffUrl from './url';
import { actions as diffActions } from './duck';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { fetchedState, TOP_NAV_HEIGHT } from '../../constants';

/* 
With v5+, redux no longer supports `bindActionCreators` to be configured.
`configurable: true` has to be supported by the compilers for it to be configured.
It has to be explicitly told using `__esModule` to babel for compiling it with that property.
*/
jest.mock('redux', () => ({ __esModule: true, ...jest.requireActual('redux') }));
jest.mock('./TraceDiffHeader', () => {
  return function MockTraceDiffHeader(props) {
    return (
      <div data-testid="trace-diff-header">
        <button type="button" data-testid="diff-set-a-btn" onClick={() => props.diffSetA('newAValue')}>
          Set A
        </button>
        <button type="button" data-testid="diff-set-b-btn" onClick={() => props.diffSetB('newBValue')}>
          Set B
        </button>
        <button type="button" data-testid="diff-set-a-empty-btn" onClick={() => props.diffSetA('')}>
          Set A Empty
        </button>
        <button type="button" data-testid="diff-set-b-empty-btn" onClick={() => props.diffSetB('')}>
          Set B Empty
        </button>
      </div>
    );
  };
});

jest.mock('./TraceDiffGraph', () => {
  return function MockTraceDiffGraph() {
    return <div data-testid="trace-diff-graph">Graph</div>;
  };
});

describe('TraceDiff', () => {
  const defaultA = 'trace-id-a';
  const defaultB = 'trace-id-b';
  const defaultCohortIds = ['trace-id-cohort-0', 'trace-id-cohort-1', 'trace-id-cohort-2'];
  const defaultCohort = [defaultA, defaultB, ...defaultCohortIds];
  const fetchMultipleTracesMock = jest.fn();
  const forceStateMock = jest.fn();
  const historyPushMock = jest.fn();
  const defaultProps = {
    a: defaultA,
    b: defaultB,
    cohort: defaultCohort,
    fetchMultipleTraces: fetchMultipleTracesMock,
    forceState: forceStateMock,
    history: {
      push: historyPushMock,
    },
    tracesData: new Map(defaultCohort.map(id => [id, { id, state: fetchedState.DONE }])),
    traceDiffState: {
      a: defaultA,
      b: defaultB,
      cohort: defaultCohort,
    },
  };
  const newAValue = 'newAValue';
  const newBValue = 'newBValue';
  const nonDefaultCohortId = 'non-default-cohort-id';
  const getUrlSpyMockReturnValue = 'getUrlSpyMockReturnValue';
  let getUrlSpy;

  beforeAll(() => {
    getUrlSpy = jest.spyOn(TraceDiffUrl, 'getUrl').mockReturnValue(getUrlSpyMockReturnValue);
  });

  beforeEach(() => {
    fetchMultipleTracesMock.mockClear();
    forceStateMock.mockClear();
    getUrlSpy.mockClear();
    historyPushMock.mockClear();
  });

  describe('syncStates', () => {
    it('forces state if a is inconsistent between url and reduxState', () => {
      render(<TraceDiffImpl {...defaultProps} a={newAValue} />);

      expect(forceStateMock).toHaveBeenLastCalledWith({
        a: newAValue,
        b: defaultProps.b,
        cohort: defaultProps.cohort,
      });
    });

    it('forces state if b is inconsistent between url and reduxState', () => {
      render(<TraceDiffImpl {...defaultProps} b={newBValue} />);

      expect(forceStateMock).toHaveBeenLastCalledWith({
        a: defaultProps.a,
        b: newBValue,
        cohort: defaultProps.cohort,
      });
    });

    it('forces state if cohort size has changed', () => {
      const newCohort = [...defaultProps.cohort, nonDefaultCohortId];
      render(<TraceDiffImpl {...defaultProps} cohort={newCohort} />);

      expect(forceStateMock).toHaveBeenLastCalledWith({
        a: defaultProps.a,
        b: defaultProps.b,
        cohort: newCohort,
      });

      forceStateMock.mockClear();

      render(
        <TraceDiffImpl {...defaultProps} traceDiffState={{ ...defaultProps.traceDiffState, cohort: null }} />
      );

      expect(forceStateMock).toHaveBeenLastCalledWith({
        a: defaultProps.a,
        b: defaultProps.b,
        cohort: defaultProps.cohort,
      });
    });

    it('forces state if cohort entry has changed', () => {
      const newCohort = [...defaultProps.cohort.slice(1), nonDefaultCohortId];
      render(<TraceDiffImpl {...defaultProps} cohort={newCohort} />);

      expect(forceStateMock).toHaveBeenLastCalledWith({
        a: defaultProps.a,
        b: defaultProps.b,
        cohort: newCohort,
      });
    });

    it('does not force state if cohorts have same values in differing orders', () => {
      render(
        <TraceDiffImpl
          {...defaultProps}
          traceDiffState={{
            ...defaultProps.traceDiffState,
            cohort: defaultProps.traceDiffState.cohort.slice().reverse(),
          }}
        />
      );

      expect(forceStateMock).not.toHaveBeenCalled();
    });
  });

  it('requests traces lacking a state', () => {
    const newId0 = 'new-id-0';
    const newId1 = 'new-id-1';
    expect(fetchMultipleTracesMock).toHaveBeenCalledTimes(0);

    render(<TraceDiffImpl {...defaultProps} cohort={[...defaultProps.cohort, newId0, newId1]} />);

    expect(fetchMultipleTracesMock).toHaveBeenCalledWith([newId0, newId1]);
    expect(fetchMultipleTracesMock).toHaveBeenCalledTimes(1);
  });

  it('does not request traces if all traces have a state', () => {
    const newId0 = 'new-id-0';
    const newId1 = 'new-id-1';
    expect(fetchMultipleTracesMock).toHaveBeenCalledTimes(0);

    const cohort = [...defaultProps.cohort, newId0, newId1];
    const tracesData = new Map(defaultProps.tracesData);
    tracesData.set(newId0, { id: newId0, state: fetchedState.ERROR });
    tracesData.set(newId1, { id: newId1, state: fetchedState.LOADING });

    render(<TraceDiffImpl {...defaultProps} cohort={cohort} tracesData={tracesData} />);

    expect(fetchMultipleTracesMock).not.toHaveBeenCalled();
  });

  it('updates url when TraceDiffHeader sets a or b', async () => {
    const user = userEvent.setup();
    render(<TraceDiffImpl {...defaultProps} />);

    await user.click(screen.getByTestId('diff-set-a-btn'));
    expect(getUrlSpy).toHaveBeenLastCalledWith({
      a: newAValue.toLowerCase(),
      b: defaultProps.b,
      cohort: defaultProps.cohort,
    });

    await user.click(screen.getByTestId('diff-set-b-btn'));
    expect(getUrlSpy).toHaveBeenLastCalledWith({
      a: defaultProps.a,
      b: newBValue.toLowerCase(),
      cohort: defaultProps.cohort,
    });

    await user.click(screen.getByTestId('diff-set-a-empty-btn'));
    expect(getUrlSpy).toHaveBeenLastCalledWith({
      a: defaultProps.a,
      b: defaultProps.b,
      cohort: defaultProps.cohort,
    });

    await user.click(screen.getByTestId('diff-set-b-empty-btn'));
    expect(getUrlSpy).toHaveBeenLastCalledWith({
      a: defaultProps.a,
      b: defaultProps.b,
      cohort: defaultProps.cohort,
    });

    expect(historyPushMock).toHaveBeenCalledTimes(4);
  });

  describe('render', () => {
    it('renders both header and graph components', () => {
      render(<TraceDiffImpl {...defaultProps} />);

      expect(screen.getByTestId('trace-diff-header')).toBeInTheDocument();
      expect(screen.getByTestId('trace-diff-graph')).toBeInTheDocument();
    });

    it('handles a and b not in props.tracesData', () => {
      const tracesData = new Map(defaultProps.tracesData);
      tracesData.delete(defaultA);
      tracesData.delete(defaultB);

      render(<TraceDiffImpl {...defaultProps} tracesData={tracesData} />);

      expect(screen.getByTestId('trace-diff-header')).toBeInTheDocument();
      expect(screen.getByTestId('trace-diff-graph')).toBeInTheDocument();
    });

    it('handles absent a and b', () => {
      render(<TraceDiffImpl {...defaultProps} a={null} b={null} />);

      expect(screen.getByTestId('trace-diff-header')).toBeInTheDocument();
      expect(screen.getByTestId('trace-diff-graph')).toBeInTheDocument();
    });
  });

  describe('TraceDiff--graphWrapper top offset', () => {
    it('applies top offset to graph wrapper based on header height', () => {
      const originalResizeObserver = window.ResizeObserver;
      window.ResizeObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));

      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = jest.fn().mockImplementation(function () {
        if (
          this.hasAttribute &&
          this.hasAttribute('data-testid') &&
          this.getAttribute('data-testid') === 'trace-diff-header'
        ) {
          return { height: 100 };
        }
        return originalGetBoundingClientRect.call(this);
      });

      render(<TraceDiffImpl {...defaultProps} />);

      const graphWrapper = document.querySelector('.TraceDiff--graphWrapper');
      expect(graphWrapper).toHaveStyle(`top: ${TOP_NAV_HEIGHT}px`);
      window.ResizeObserver = originalResizeObserver;
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('calls setGraphTopOffset and updates graphTopOffset state on header ref change', () => {
      const mockHeight = 120;
      const expectedTop = TOP_NAV_HEIGHT + mockHeight;

      const mockDiv = document.createElement('div');
      Object.defineProperty(mockDiv, 'clientHeight', {
        value: mockHeight,
      });

      const ref = React.createRef();

      const { rerender, container } = render(<TraceDiffImpl {...defaultProps} ref={ref} />);

      ref.current.headerWrapperRef(mockDiv);

      rerender(<TraceDiffImpl {...defaultProps} ref={ref} cohort={[...defaultProps.cohort, 'new-id']} />);

      const graphWrapper = container.querySelector('.TraceDiff--graphWrapper');
      expect(graphWrapper).toHaveStyle(`top: ${expectedTop}px`);
    });
  });

  describe('mapStateToProps', () => {
    const getOwnProps = ({ a = defaultA, b = defaultB } = {}) => ({
      params: {
        a,
        b,
      },
    });
    const makeTestReduxState = ({ cohortIds = defaultCohortIds } = {}) => ({
      router: {
        location: {
          search: queryString.stringify({ cohort: cohortIds }),
        },
      },
      trace: {
        traces: cohortIds.reduce((traces, id) => ({ ...traces, [id]: { id, state: fetchedState.DONE } }), {}),
      },
      traceDiff: {
        a: 'trace-diff-a',
        b: 'trace-diff-b',
      },
    });

    it('gets a and b from ownProps', () => {
      expect(mapStateToProps(makeTestReduxState(), getOwnProps())).toEqual(
        expect.objectContaining({
          a: defaultA,
          b: defaultB,
        })
      );
    });

    it('defaults cohort to empty array if a, b, and cohort are not available', () => {
      expect(
        mapStateToProps(makeTestReduxState({ cohortIds: [] }), getOwnProps({ a: null, b: null })).cohort
      ).toEqual([]);
    });

    it('gets cohort from ownProps and state.router.location.search', () => {
      expect(mapStateToProps(makeTestReduxState(), getOwnProps()).cohort).toEqual([
        defaultA,
        defaultB,
        ...defaultCohortIds,
      ]);
    });

    it('filters falsy values from cohort', () => {
      expect(mapStateToProps(makeTestReduxState(), getOwnProps({ a: null })).cohort).toEqual([
        defaultB,
        ...defaultCohortIds,
      ]);

      expect(mapStateToProps(makeTestReduxState(), getOwnProps({ b: null })).cohort).toEqual([
        defaultA,
        ...defaultCohortIds,
      ]);

      expect(
        mapStateToProps(
          makeTestReduxState({ cohortIds: [...defaultCohortIds, '', nonDefaultCohortId] }),
          getOwnProps()
        ).cohort
      ).toEqual([defaultA, defaultB, ...defaultCohortIds, nonDefaultCohortId]);
    });

    it('filters redundant values from cohort', () => {
      expect(
        mapStateToProps(
          makeTestReduxState({ cohortIds: [...defaultCohortIds, nonDefaultCohortId] }),
          getOwnProps({ a: nonDefaultCohortId })
        ).cohort
      ).toEqual([nonDefaultCohortId, defaultB, ...defaultCohortIds]);

      expect(
        mapStateToProps(
          makeTestReduxState({ cohortIds: [...defaultCohortIds, nonDefaultCohortId] }),
          getOwnProps({ b: nonDefaultCohortId })
        ).cohort
      ).toEqual([defaultA, nonDefaultCohortId, ...defaultCohortIds]);

      expect(
        mapStateToProps(
          makeTestReduxState({ cohortIds: [...defaultCohortIds, nonDefaultCohortId, nonDefaultCohortId] }),
          getOwnProps()
        ).cohort
      ).toEqual([defaultA, defaultB, ...defaultCohortIds, nonDefaultCohortId]);
    });

    it('builds tracesData Map from cohort and state.trace.traces', () => {
      const {
        tracesData,
        cohort: { length: expectedSize },
      } = mapStateToProps(makeTestReduxState(), getOwnProps());
      defaultCohortIds.forEach(id => {
        expect(tracesData.get(id)).toEqual({
          id,
          state: fetchedState.DONE,
        });
      });
      expect(tracesData.get(defaultA)).toEqual({
        id: defaultA,
        state: null,
      });
      expect(tracesData.get(defaultB)).toEqual({
        id: defaultB,
        state: null,
      });
      expect(tracesData.size).toBe(expectedSize);
    });

    it('includes state.traceDiff as traceDiffState', () => {
      const testReduxState = makeTestReduxState();
      const { traceDiffState } = mapStateToProps(testReduxState, getOwnProps());
      expect(traceDiffState).toBe(testReduxState.traceDiff);
    });
  });

  describe('mapDispatchToProps', () => {
    let bindActionCreatorsSpy;

    beforeAll(() => {
      bindActionCreatorsSpy = jest.spyOn(redux, 'bindActionCreators').mockImplementation(actions => {
        if (actions === jaegerApiActions) {
          return { fetchMultipleTraces: fetchMultipleTracesMock };
        }
        if (actions === diffActions) {
          return { forceState: forceStateMock };
        }
        return {};
      });
    });

    afterAll(() => {
      bindActionCreatorsSpy.mockRestore();
    });

    it('correctly binds actions to dispatch', () => {
      const dispatchMock = () => {};
      const result = mapDispatchToProps(dispatchMock);
      expect(result.fetchMultipleTraces).toBe(fetchMultipleTracesMock);
      expect(result.forceState).toBe(forceStateMock);
      expect(bindActionCreatorsSpy.mock.calls[0][1]).toBe(dispatchMock);
    });
  });
});
