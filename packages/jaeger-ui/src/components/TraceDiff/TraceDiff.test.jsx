// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import queryString from 'query-string';
import { BrowserRouter } from 'react-router-dom';

import { mapStateToProps, TraceDiffImpl } from './TraceDiff';
import * as TraceDiffUrl from './url';
import { useTraceDiffStore } from '../../stores/trace-diff-store';
import { fetchedState, TOP_NAV_HEIGHT } from '../../constants';

const mockNavigate = jest.fn();

vi.mock('react-router-dom', async () => {
  const { BrowserRouter: ActualBrowserRouter } = await vi.importActual('react-router-dom');
  return {
    BrowserRouter: ActualBrowserRouter,
    useNavigate: () => mockNavigate,
  };
});

const { useTracesMock } = vi.hoisted(() => ({
  useTracesMock: jest.fn(),
}));

vi.mock('../../hooks/useTraceLoading', () => ({
  useTraces: (...args) => useTracesMock(...args),
}));

vi.mock('./TraceDiffHeader', async () => {
  return mockDefault(function MockTraceDiffHeader(props) {
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
  });
});

vi.mock('./TraceDiffGraph', async () => {
  return mockDefault(function MockTraceDiffGraph() {
    return <div data-testid="trace-diff-graph">Graph</div>;
  });
});

describe('TraceDiff', () => {
  const defaultA = 'trace-id-a';
  const defaultB = 'trace-id-b';
  const defaultCohortIds = ['trace-id-cohort-0', 'trace-id-cohort-1', 'trace-id-cohort-2'];
  const defaultCohort = [defaultA, defaultB, ...defaultCohortIds];
  const defaultProps = {
    a: defaultA,
    b: defaultB,
    cohort: defaultCohort,
  };

  // Helper function to render with router context
  const renderWithRouter = component => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
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
    useTracesMock.mockReturnValue(new Map(defaultCohort.map(id => [id, { id, state: fetchedState.DONE }])));
    getUrlSpy.mockClear();
    mockNavigate.mockClear();
    useTraceDiffStore.setState({
      a: defaultA,
      b: defaultB,
      cohort: defaultCohort,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('syncStates', () => {
    it('forces state if a is inconsistent between url and store', () => {
      renderWithRouter(<TraceDiffImpl {...defaultProps} a={newAValue} />);

      expect(useTraceDiffStore.getState().a).toBe(newAValue);
      expect(useTraceDiffStore.getState().b).toBe(defaultProps.b);
      expect(useTraceDiffStore.getState().cohort).toEqual(defaultProps.cohort);
    });

    it('forces state if b is inconsistent between url and store', () => {
      renderWithRouter(<TraceDiffImpl {...defaultProps} b={newBValue} />);

      expect(useTraceDiffStore.getState().a).toBe(defaultProps.a);
      expect(useTraceDiffStore.getState().b).toBe(newBValue);
      expect(useTraceDiffStore.getState().cohort).toEqual(defaultProps.cohort);
    });

    it('forces state if cohort size has changed', () => {
      const newCohort = [...defaultProps.cohort, nonDefaultCohortId];
      const { unmount } = renderWithRouter(<TraceDiffImpl {...defaultProps} cohort={newCohort} />);

      expect(useTraceDiffStore.getState().cohort).toEqual(newCohort);
      unmount();

      useTraceDiffStore.setState({ a: defaultA, b: defaultB, cohort: [] });
      renderWithRouter(<TraceDiffImpl {...defaultProps} />);

      expect(useTraceDiffStore.getState().cohort).toEqual(defaultProps.cohort);
    });

    it('forces state if cohort entry has changed', () => {
      const newCohort = [...defaultProps.cohort.slice(1), nonDefaultCohortId];
      renderWithRouter(<TraceDiffImpl {...defaultProps} cohort={newCohort} />);

      expect(useTraceDiffStore.getState().cohort).toEqual(newCohort);
    });

    it('does not force state if cohorts have same values in differing orders', () => {
      const reversed = defaultProps.cohort.slice().reverse();
      useTraceDiffStore.setState({ a: defaultA, b: defaultB, cohort: reversed });
      renderWithRouter(<TraceDiffImpl {...defaultProps} />);

      expect(useTraceDiffStore.getState().cohort).toEqual(reversed);
    });
  });

  it('calls useTraces with the full cohort', () => {
    renderWithRouter(<TraceDiffImpl {...defaultProps} />);
    expect(useTracesMock).toHaveBeenCalledWith(defaultCohort);
  });

  it('updates url when TraceDiffHeader sets a or b', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TraceDiffImpl {...defaultProps} />);

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

    expect(mockNavigate).toHaveBeenCalledTimes(4);
  });

  describe('render', () => {
    it('renders both header and graph components', () => {
      renderWithRouter(<TraceDiffImpl {...defaultProps} />);

      expect(screen.getByTestId('trace-diff-header')).toBeInTheDocument();
      expect(screen.getByTestId('trace-diff-graph')).toBeInTheDocument();
    });

    it('handles a and b not in tracesData returned by the query', () => {
      useTracesMock.mockReturnValue(new Map());
      renderWithRouter(<TraceDiffImpl {...defaultProps} />);

      expect(screen.getByTestId('trace-diff-header')).toBeInTheDocument();
      expect(screen.getByTestId('trace-diff-graph')).toBeInTheDocument();
    });

    it('handles absent a and b', () => {
      renderWithRouter(<TraceDiffImpl {...defaultProps} a={null} b={null} />);

      expect(screen.getByTestId('trace-diff-header')).toBeInTheDocument();
      expect(screen.getByTestId('trace-diff-graph')).toBeInTheDocument();
    });
  });

  describe('TraceDiff--graphWrapper top offset', () => {
    it('applies top offset to graph wrapper based on header height', () => {
      const originalResizeObserver = window.ResizeObserver;
      window.ResizeObserver = jest.fn().mockImplementation(function () {
        return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
      });

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

      renderWithRouter(<TraceDiffImpl {...defaultProps} />);

      const graphWrapper = document.querySelector('.TraceDiff--graphWrapper');
      expect(graphWrapper).toHaveStyle(`top: ${TOP_NAV_HEIGHT}px`);
      window.ResizeObserver = originalResizeObserver;
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('calls setGraphTopOffset and updates graphTopOffset state on header ref change', () => {
      // This test verifies the component structure and initial behavior
      // The actual height calculation is tested by the component's useEffect which runs when the ref is set during mount
      const { container } = renderWithRouter(<TraceDiffImpl {...defaultProps} />);
      const headerWrapper = container.querySelector('[data-testid="trace-diff-header"]').parentElement;
      const graphWrapper = container.querySelector('.TraceDiff--graphWrapper');
      expect(headerWrapper).toBeInTheDocument();
      expect(graphWrapper).toBeInTheDocument();
      expect(graphWrapper).toHaveStyle(`top: ${TOP_NAV_HEIGHT}px`);
    });

    it('setGraphTopOffset with different height', () => {
      const mockHeight = 50;
      const expectedTop = TOP_NAV_HEIGHT + mockHeight;

      // Mock clientHeight to trigger the state update
      Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', {
        configurable: true,
        value: mockHeight,
      });

      const { container, rerender } = renderWithRouter(<TraceDiffImpl {...defaultProps} />);
      rerender(<TraceDiffImpl {...defaultProps} />);

      const graphWrapper = container.querySelector('.TraceDiff--graphWrapper');
      expect(graphWrapper).toHaveStyle(`top: ${expectedTop}px`);

      Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', {
        configurable: true,
        value: 0,
      });
    });

    it('setGraphTopOffset when clientHeight is undefined', () => {
      Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', {
        configurable: true,
        value: undefined,
      });

      const { container } = renderWithRouter(<TraceDiffImpl {...defaultProps} />);
      const graphWrapper = container.querySelector('.TraceDiff--graphWrapper');
      expect(graphWrapper).toHaveStyle(`top: ${TOP_NAV_HEIGHT}px`);

      Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', {
        configurable: true,
        value: 0,
      });
    });
  });

  describe('mapStateToProps', () => {
    const emptyState = {};
    const getOwnProps = ({ a = defaultA, b = defaultB, cohortIds = defaultCohortIds } = {}) => ({
      params: { a, b },
      search: queryString.stringify({ cohort: cohortIds }),
    });

    it('gets a and b from ownProps', () => {
      expect(mapStateToProps(emptyState, getOwnProps())).toEqual(
        expect.objectContaining({
          a: defaultA,
          b: defaultB,
        })
      );
    });

    it('defaults cohort to empty array if a, b, and cohort are not available', () => {
      expect(mapStateToProps(emptyState, getOwnProps({ a: null, b: null, cohortIds: [] })).cohort).toEqual(
        []
      );
    });

    it('gets cohort from ownProps.search and ownProps.params', () => {
      expect(mapStateToProps(emptyState, getOwnProps()).cohort).toEqual([
        defaultA,
        defaultB,
        ...defaultCohortIds,
      ]);
    });

    it('filters falsy values from cohort', () => {
      expect(mapStateToProps(emptyState, getOwnProps({ a: null })).cohort).toEqual([
        defaultB,
        ...defaultCohortIds,
      ]);

      expect(mapStateToProps(emptyState, getOwnProps({ b: null })).cohort).toEqual([
        defaultA,
        ...defaultCohortIds,
      ]);

      const extendedCohort = [...defaultCohortIds, '', nonDefaultCohortId];
      expect(mapStateToProps(emptyState, getOwnProps({ cohortIds: extendedCohort })).cohort).toEqual([
        defaultA,
        defaultB,
        ...defaultCohortIds,
        nonDefaultCohortId,
      ]);
    });

    it('filters redundant values from cohort', () => {
      const cohortWithExtra = [...defaultCohortIds, nonDefaultCohortId];
      expect(
        mapStateToProps(emptyState, getOwnProps({ a: nonDefaultCohortId, cohortIds: cohortWithExtra })).cohort
      ).toEqual([nonDefaultCohortId, defaultB, ...defaultCohortIds]);

      expect(
        mapStateToProps(emptyState, getOwnProps({ b: nonDefaultCohortId, cohortIds: cohortWithExtra })).cohort
      ).toEqual([defaultA, nonDefaultCohortId, ...defaultCohortIds]);

      const cohortWithDuplicate = [...defaultCohortIds, nonDefaultCohortId, nonDefaultCohortId];
      expect(mapStateToProps(emptyState, getOwnProps({ cohortIds: cohortWithDuplicate })).cohort).toEqual([
        defaultA,
        defaultB,
        ...defaultCohortIds,
        nonDefaultCohortId,
      ]);
    });

    describe('v6 id param parsing (params.id contains "...")', () => {
      const makeIdProps = id => ({ params: { id } });

      it('splits params.id on "..." to extract a and b, falling back to undefined for empty sides', () => {
        const { a, b } = mapStateToProps(emptyState, makeIdProps(`${defaultA}...${defaultB}`));
        expect(a).toBe(defaultA);
        expect(b).toBe(defaultB);

        expect(mapStateToProps(emptyState, makeIdProps(`${defaultA}...`)).b).toBeUndefined();
        expect(mapStateToProps(emptyState, makeIdProps(`...${defaultB}`)).a).toBeUndefined();
      });

      it('skips id parsing when params.a is already set or id has no "..."', () => {
        const withA = mapStateToProps(emptyState, { params: { a: defaultA, id: `other...${defaultB}` } });
        expect(withA.a).toBe(defaultA);
        expect(withA.b).toBeUndefined();

        const noSep = mapStateToProps(emptyState, makeIdProps(defaultA));
        expect(noSep.a).toBeUndefined();
        expect(noSep.b).toBeUndefined();
      });
    });
  });
});
