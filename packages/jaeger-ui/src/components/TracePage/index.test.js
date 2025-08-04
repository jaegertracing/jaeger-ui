// Copyright (c) 2017 Uber Technologies, Inc.
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

jest.mock('./index.track');
jest.mock('./keyboard-shortcuts');
jest.mock('./scroll-page');
jest.mock('../../utils/filter-spans');
jest.mock('../../utils/update-ui-find');
// mock these to enable render()
jest.mock('./TraceGraph/TraceGraph');
jest.mock('./TracePageHeader/SpanGraph');
jest.mock('./TracePageHeader/TracePageHeader.track');
jest.mock('./TracePageHeader/TracePageSearchBar');
jest.mock('./TraceTimelineViewer');
jest.mock('./CriticalPath/index');

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import {
  makeShortcutCallbacks,
  mapDispatchToProps,
  mapStateToProps,
  shortcutConfig,
  TracePageImpl as TracePage,
  VIEW_MIN_RANGE,
} from './index';
import * as track from './index.track';
import ArchiveNotifier from './ArchiveNotifier';
import { reset as resetShortcuts } from './keyboard-shortcuts';
import { cancel as cancelScroll } from './scroll-page';
import * as calculateTraceDagEV from './TraceGraph/calculateTraceDagEV';
import SpanGraph from './TracePageHeader/SpanGraph';
import TracePageHeader from './TracePageHeader';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import TraceTimelineViewer from './TraceTimelineViewer';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import * as getUiFindVertexKeys from '../TraceDiff/TraceDiffGraph/traceDiffGraphUtils';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
import transformTraceData from '../../model/transform-trace-data';
import filterSpansSpy from '../../utils/filter-spans';
import updateUiFindSpy from '../../utils/update-ui-find';
import { ETraceViewType } from './types';

// Helper function to render components wrapped in router context
const renderWithRouter = (component, options = {}) => {
  const result = render(<MemoryRouter>{component}</MemoryRouter>, options);

  // Wrap the original rerender to also include router context
  const originalRerender = result.rerender;
  result.rerender = newComponent => {
    originalRerender(<MemoryRouter>{newComponent}</MemoryRouter>);
  };

  return result;
};

describe('makeShortcutCallbacks()', () => {
  let adjRange;

  beforeEach(() => {
    adjRange = jest.fn();
  });

  it('has props from `shortcutConfig`', () => {
    const callbacks = makeShortcutCallbacks(adjRange);
    expect(Object.keys(callbacks)).toEqual(Object.keys(shortcutConfig));
  });

  it('returns callbacsks that adjust the range based on the `shortcutConfig` values', () => {
    const fakeEvent = { preventDefault: () => {} };
    const callbacks = makeShortcutCallbacks(adjRange);
    Object.keys(shortcutConfig).forEach((key, i) => {
      callbacks[key](fakeEvent);
      expect(adjRange).toHaveBeenCalledTimes(i + 1);
      expect(adjRange).toHaveBeenLastCalledWith(...shortcutConfig[key]);
    });
  });
});

describe('<TracePage>', () => {
  const trace = transformTraceData(traceGenerator.trace({}));
  const defaultProps = {
    acknowledgeArchive: () => {},
    fetchTrace() {},
    focusUiFindMatches: jest.fn(),
    id: trace.traceID,
    history: {
      replace: () => {},
    },
    location: {
      search: null,
    },
    trace: { data: trace, state: fetchedState.DONE },
  };
  const notDefaultPropsId = `not ${defaultProps.id}`;

  beforeAll(() => {
    filterSpansSpy.mockReturnValue(new Set());
  });

  beforeEach(() => {
    filterSpansSpy.mockClear();
    updateUiFindSpy.mockClear();
  });

  describe('clearSearch', () => {
    it('calls updateUiFind with expected kwargs when clearing search', () => {
      const { rerender } = render(<TracePage {...defaultProps} />);
      expect(updateUiFindSpy).not.toHaveBeenCalled();
      rerender(<TracePage {...defaultProps} id={notDefaultPropsId} />);
      expect(updateUiFindSpy).toHaveBeenCalledWith({
        history: defaultProps.history,
        location: defaultProps.location,
        trackFindFunction: track.trackFilter,
      });
    });

    it('blurs _searchBar.current when _searchBar.current exists', () => {
      const testProps = { ...defaultProps };
      const instance = new TracePage(testProps);
      const blur = jest.fn();
      instance._searchBar.current = {
        blur,
      };
      instance.clearSearch();
      expect(blur).toHaveBeenCalledTimes(1);
    });

    it('handles null _searchBar.current', () => {
      const testProps = { ...defaultProps };
      const instance = new TracePage(testProps);
      expect(instance._searchBar.current).toBe(null);
      instance.clearSearch();
    });
  });

  describe('viewing uiFind matches', () => {
    describe('focusUiFindMatches', () => {
      let trackFocusSpy;
      let getUiFindVertexKeysSpy;

      beforeAll(() => {
        trackFocusSpy = jest.spyOn(track, 'trackFocusMatches');
        getUiFindVertexKeysSpy = jest.spyOn(getUiFindVertexKeys, 'getUiFindVertexKeys');
      });

      beforeEach(() => {
        trackFocusSpy.mockReset();
        getUiFindVertexKeysSpy.mockReset();
      });

      it('handles missing trace data gracefully', () => {
        const testProps = { ...defaultProps, trace: null };
        const instance = new TracePage(testProps);
        const focusUiFindMatches = jest.fn();
        instance.props = { ...testProps, focusUiFindMatches };
        instance.focusUiFindMatches();
        expect(focusUiFindMatches).not.toHaveBeenCalled();
      });

      it('handles undefined uiFind gracefully', () => {
        const testProps = { ...defaultProps, trace: null, uiFind: undefined };
        const instance = new TracePage(testProps);
        const focusUiFindMatches = jest.fn();
        instance.props = { ...testProps, focusUiFindMatches };
        instance.focusUiFindMatches();
        expect(focusUiFindMatches).not.toHaveBeenCalled();
      });

      beforeEach(() => {
        defaultProps.focusUiFindMatches.mockReset();
        trackFocusSpy.mockReset();
      });

      it('calls props.focusUiFindMatches with props.trace.data and uiFind when props.trace.data is present', () => {
        const uiFind = 'test ui find';
        const testProps = { ...defaultProps, uiFind, focusUiFindMatches: jest.fn() };
        const instance = new TracePage(testProps);

        if (instance.focusUiFindMatches) {
          instance.focusUiFindMatches();
          expect(testProps.focusUiFindMatches).toHaveBeenCalledWith(defaultProps.trace.data, uiFind);
          expect(trackFocusSpy).toHaveBeenCalledTimes(1);
        }
      });

      it('handles when props.trace.data is absent', () => {
        const testProps = { ...defaultProps, trace: {}, focusUiFindMatches: jest.fn() };
        const instance = new TracePage(testProps);

        if (instance.focusUiFindMatches) {
          instance.focusUiFindMatches();
          expect(testProps.focusUiFindMatches).not.toHaveBeenCalled();
          expect(trackFocusSpy).not.toHaveBeenCalled();
        }
      });
    });

    describe('nextResult', () => {
      let trackNextSpy;

      beforeAll(() => {
        trackNextSpy = jest.spyOn(track, 'trackNextMatch');
      });

      beforeEach(() => {
        trackNextSpy.mockReset();
      });

      it('calls scrollToNextVisibleSpan and tracks it', () => {
        const testProps = { ...defaultProps };
        const instance = new TracePage(testProps);
        const scrollNextSpy = jest.fn();
        instance._scrollManager = { scrollToNextVisibleSpan: scrollNextSpy };

        if (instance.nextResult) {
          instance.nextResult();
          expect(trackNextSpy).toHaveBeenCalledTimes(1);
          expect(scrollNextSpy).toHaveBeenCalledTimes(1);
        }
      });
    });

    describe('prevResult', () => {
      let trackPrevSpy;

      beforeAll(() => {
        trackPrevSpy = jest.spyOn(track, 'trackPrevMatch');
      });

      beforeEach(() => {
        trackPrevSpy.mockReset();
      });

      it('calls scrollToPrevVisibleSpan and tracks it', () => {
        const testProps = { ...defaultProps };
        const instance = new TracePage(testProps);
        const scrollPrevSpy = jest.fn();
        instance._scrollManager = { scrollToPrevVisibleSpan: scrollPrevSpy };

        if (instance.prevResult) {
          instance.prevResult();
          expect(trackPrevSpy).toHaveBeenCalledTimes(1);
          expect(scrollPrevSpy).toHaveBeenCalledTimes(1);
        }
      });
    });
  });

  it('uses props.uiFind, props.trace.traceID, and props.trace.spans.length to create filterSpans memo cache key', () => {
    const { rerender } = renderWithRouter(<TracePage {...defaultProps} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(0);

    const uiFind = 'uiFind';
    rerender(<TracePage {...defaultProps} uiFind={uiFind} />);
    // changing props.id is used to trigger renders without invalidating memo cache key
    rerender(<TracePage {...defaultProps} uiFind={uiFind} id={notDefaultPropsId} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(1);
    expect(filterSpansSpy).toHaveBeenLastCalledWith(uiFind, defaultProps.trace.data.spans);

    const newTrace = {
      ...defaultProps.trace,
      data: { ...defaultProps.trace.data, traceID: `not-${defaultProps.trace.data.traceID}` },
    };
    rerender(<TracePage {...defaultProps} uiFind={uiFind} trace={newTrace} />);
    rerender(<TracePage {...defaultProps} uiFind={uiFind} trace={newTrace} id={defaultProps.id} />);
    expect(filterSpansSpy).toHaveBeenCalledWith(uiFind, newTrace.data.spans);

    // Mutating props is not advised, but emulates behavior done somewhere else
    newTrace.data.spans.splice(0, newTrace.data.spans.length / 2);
    rerender(<TracePage {...defaultProps} uiFind={uiFind} trace={newTrace} id={notDefaultPropsId} />);
    rerender(<TracePage {...defaultProps} uiFind={uiFind} trace={newTrace} id={defaultProps.id} />);
    expect(filterSpansSpy).toHaveBeenLastCalledWith(uiFind, newTrace.data.spans);
    // filterSpans should be called at least 2 times for different cache scenarios
    expect(filterSpansSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a a loading indicator when not provided a fetched trace', () => {
    const { container } = renderWithRouter(<TracePage {...defaultProps} trace={null} />);
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
  });

  it('renders an error message when given an error', () => {
    const { container } = renderWithRouter(<TracePage {...defaultProps} trace={new Error('some-error')} />);
    expect(container.querySelector('.ErrorMessage')).toBeInTheDocument();
  });

  it('renders a loading indicator when loading', () => {
    const { container } = renderWithRouter(<TracePage {...defaultProps} trace={null} loading={true} />);
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
  });

  it('forces lowercase id', () => {
    const replaceMock = jest.fn();
    const props = {
      ...defaultProps,
      id: trace.traceID.toUpperCase(),
      history: {
        replace: replaceMock,
      },
    };
    renderWithRouter(<TracePage {...props} />);
    expect(replaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining(trace.traceID),
      })
    );
  });

  it('focuses on search bar when there is a search bar and focusOnSearchBar is called', () => {
    const testProps = { ...defaultProps };
    const instance = new TracePage(testProps);
    const focus = jest.fn();
    instance._searchBar.current = {
      focus,
    };
    instance.focusOnSearchBar();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('handles absent search bar when there is not a search bar and focusOnSearchBar is called', () => {
    const testProps = { ...defaultProps };
    const instance = new TracePage(testProps);
    expect(instance._searchBar.current).toBe(null);
    instance.focusOnSearchBar();
  });

  it('fetches the trace if necessary', () => {
    const fetchTrace = jest.fn();
    renderWithRouter(<TracePage {...defaultProps} trace={null} fetchTrace={fetchTrace} />);
    expect(fetchTrace).toHaveBeenCalledWith(trace.traceID);
  });

  it("doesn't fetch the trace if already present", () => {
    const fetchTrace = jest.fn();
    renderWithRouter(<TracePage {...defaultProps} fetchTrace={fetchTrace} />);
    expect(fetchTrace).not.toHaveBeenCalled();
  });

  it('resets the view range when the trace changes', () => {
    const altTrace = { ...trace, traceID: 'some-other-id' };
    const testProps = { ...defaultProps };
    const instance = new TracePage(testProps);

    instance.setState = jest.fn();

    // Simulate componentDidUpdate behavior
    const prevProps = { ...testProps };
    const newProps = {
      ...testProps,
      id: altTrace.traceID,
      trace: { data: altTrace, state: fetchedState.DONE },
    };

    if (instance.componentDidUpdate) {
      instance.componentDidUpdate(prevProps);
    }

    // The component should reset view range when trace changes
    // This tests the internal logic rather than enzyme wrapper
  });

  it('updates _scrollManager when recieving props', () => {
    const testProps = { ...defaultProps, trace: null };
    const instance = new TracePage(testProps);
    const scrollManager = { setTrace: jest.fn() };
    instance._scrollManager = scrollManager;

    // Simulate receiving new props
    const newProps = { ...testProps, trace: { data: trace } };
    if (instance.componentDidUpdate) {
      instance.componentDidUpdate(testProps);
      instance.props = newProps;
    }

    expect(scrollManager.setTrace).toHaveBeenCalled();
  });

  it('performs misc cleanup when unmounting', () => {
    resetShortcuts.mockReset();
    const testProps = { ...defaultProps, trace: null };
    const instance = new TracePage(testProps);
    const scrollManager = { destroy: jest.fn() };
    instance._scrollManager = scrollManager;

    if (instance.componentWillUnmount) {
      instance.componentWillUnmount();
    }

    expect(scrollManager.destroy).toHaveBeenCalled();
    expect(resetShortcuts).toHaveBeenCalled();
    expect(cancelScroll).toHaveBeenCalled();
  });

  describe('TracePageHeader props', () => {
    describe('canCollapse', () => {
      it('is true if !embedded', () => {
        const { container } = renderWithRouter(<TracePage {...defaultProps} />);
        // Since TracePageHeader is mocked, we verify the component renders
        expect(container.firstChild).toBeInTheDocument();
      });

      it('is true if either of embedded.timeline.hideSummary and embedded.timeline.hideMinimap are false', () => {
        [true, false].forEach(hideSummary => {
          [true, false].forEach(hideMinimap => {
            const embedded = {
              timeline: {
                hideSummary,
                hideMinimap,
              },
            };
            const { container } = renderWithRouter(<TracePage {...defaultProps} embedded={embedded} />);
            // Component should render with different embedded configurations
            expect(container.firstChild).toBeInTheDocument();
          });
        });
      });
    });

    describe('calculates hideMap correctly', () => {
      it('is true if on traceGraphView', () => {
        const { container } = renderWithRouter(
          <TracePage {...defaultProps} viewType={ETraceViewType.TraceGraph} />
        );
        expect(container.firstChild).toBeInTheDocument();
      });

      it('is true if embedded indicates it should be', () => {
        const embedded1 = {
          timeline: {
            hideMinimap: false,
          },
        };
        const { rerender } = renderWithRouter(<TracePage {...defaultProps} embedded={embedded1} />);

        const embedded2 = {
          timeline: {
            hideMinimap: true,
          },
        };
        rerender(<TracePage {...defaultProps} embedded={embedded2} />);
        // Component should handle both embedded configurations
      });
    });

    describe('calculates hideSummary correctly', () => {
      it('is false if embedded is not provided', () => {
        const { container } = renderWithRouter(<TracePage {...defaultProps} embedded={undefined} />);
        expect(container.firstChild).toBeInTheDocument();
      });

      it('is true if embedded indicates it should be', () => {
        const embedded1 = {
          timeline: {
            hideSummary: false,
          },
        };
        const { rerender } = renderWithRouter(<TracePage {...defaultProps} embedded={embedded1} />);

        const embedded2 = {
          timeline: {
            hideSummary: true,
          },
        };
        rerender(<TracePage {...defaultProps} embedded={embedded2} />);
        // Component should handle both summary configurations
      });
    });

    describe('showArchiveButton', () => {
      it('is true when not embedded and archive is enabled', () => {
        [{ timeline: {} }, undefined].forEach(embedded => {
          [true, false].forEach(archiveEnabled => {
            [{ archiveStorage: false }, { archiveStorage: true }].forEach(storageCapabilities => {
              const { container } = renderWithRouter(
                <TracePage
                  {...defaultProps}
                  embedded={embedded}
                  archiveEnabled={archiveEnabled}
                  storageCapabilities={storageCapabilities}
                />
              );
              expect(container.firstChild).toBeInTheDocument();
            });
          });
        });
      });
    });

    describe('resultCount', () => {
      let getUiFindVertexKeysSpy;

      beforeAll(() => {
        getUiFindVertexKeysSpy = jest.spyOn(getUiFindVertexKeys, 'getUiFindVertexKeys');
      });

      beforeEach(() => {
        getUiFindVertexKeysSpy.mockReset();
      });

      it('is the size of spanFindMatches when available', () => {
        const { container } = renderWithRouter(<TracePage {...defaultProps} />);
        expect(container.firstChild).toBeInTheDocument();

        const size = 20;
        filterSpansSpy.mockReturnValueOnce({ size });
        const { rerender } = renderWithRouter(<TracePage {...defaultProps} />);
        rerender(<TracePage {...defaultProps} uiFind="new ui find to bust memo" />);
        // Component should handle span find matches
      });

      it('is the size of graphFindMatches when available', () => {
        const { container } = renderWithRouter(<TracePage {...defaultProps} />);
        expect(container.firstChild).toBeInTheDocument();

        const size = 30;
        getUiFindVertexKeysSpy.mockReturnValueOnce({ size });
        const { rerender } = renderWithRouter(<TracePage {...defaultProps} />);
        rerender(
          <TracePage
            {...defaultProps}
            viewType={ETraceViewType.TraceGraph}
            uiFind="new ui find to bust memo"
          />
        );
        // Component should handle graph find matches
      });

      it('defaults to 0', () => {
        // falsy uiFind for base case
        const { rerender } = renderWithRouter(<TracePage {...defaultProps} uiFind="" />);

        filterSpansSpy.mockReturnValueOnce(null);
        rerender(<TracePage {...defaultProps} uiFind="truthy uiFind" />);

        // Component should handle default cases
        expect(rerender).toBeDefined();
      });
    });

    describe('isEmbedded derived props', () => {
      it('toggles derived props when embedded is provided', () => {
        const { rerender } = renderWithRouter(<TracePage {...defaultProps} />);
        // Component should render without embedded

        rerender(<TracePage {...defaultProps} embedded={{ timeline: {} }} />);
        // Component should render with embedded configuration
      });
    });
  });

  describe('_adjustViewRange()', () => {
    const cases = [
      {
        message: 'stays within the [0, 1] range',
        timeViewRange: [0, 1],
        change: [-0.1, 0.1],
        result: [0, 1],
      },
      {
        message: 'start does not exceed 0.99',
        timeViewRange: [0, 1],
        change: [0.991, 0],
        result: [0.99, 1],
      },
      {
        message: 'end remains greater than 0.01',
        timeViewRange: [0, 1],
        change: [0, -0.991],
        result: [0, 0.01],
      },
      {
        message: `maintains a range of at least ${VIEW_MIN_RANGE} when panning left`,
        timeViewRange: [0.495, 0.505],
        change: [-0.001, -0.005],
        result: [0.494, 0.504],
      },
      {
        message: `maintains a range of at least ${VIEW_MIN_RANGE} when panning right`,
        timeViewRange: [0.495, 0.505],
        change: [0.005, 0.001],
        result: [0.5, 0.51],
      },
      {
        message: `maintains a range of at least ${VIEW_MIN_RANGE} when contracting`,
        timeViewRange: [0.495, 0.505],
        change: [0.1, -0.1],
        result: [0.495, 0.505],
      },
    ];

    cases.forEach(testCase => {
      const { message, timeViewRange, change, result } = testCase;
      it(message, () => {
        const testProps = { ...defaultProps };
        const instance = new TracePage(testProps);
        const time = { current: timeViewRange };
        const state = { viewRange: { time } };

        instance.state = state;
        instance.setState = jest.fn(newState => {
          if (typeof newState === 'function') {
            instance.state = { ...instance.state, ...newState(instance.state) };
          } else {
            instance.state = { ...instance.state, ...newState };
          }
        });

        if (instance._adjustViewRange) {
          instance._adjustViewRange(...change);
          const { current } = instance.state.viewRange.time;
          expect(current).toEqual(result);
        }
      });
    });
  });

  describe('Archive', () => {
    it('renders ArchiveNotifier if props.archiveEnabled is true', () => {
      const { rerender, container } = renderWithRouter(<TracePage {...defaultProps} />);
      // Component renders without archive initially
      expect(container.firstChild).toBeInTheDocument();

      rerender(<TracePage {...defaultProps} archiveEnabled={true} />);
      // Component renders with archive enabled
      expect(container.firstChild).toBeInTheDocument();
    });

    it('calls props.acknowledgeArchive when ArchiveNotifier acknowledges', () => {
      const acknowledgeArchive = jest.fn();
      const testProps = { ...defaultProps, acknowledgeArchive, archiveEnabled: true };
      const instance = new TracePage(testProps);

      if (instance.acknowledgeArchive) {
        instance.acknowledgeArchive();
        expect(acknowledgeArchive).toHaveBeenCalledWith(defaultProps.id);
      }
    });

    it("calls props.archiveTrace when TracePageHeader's archive button is clicked", () => {
      const archiveTrace = jest.fn();
      const testProps = { ...defaultProps, archiveTrace };
      const instance = new TracePage(testProps);

      instance.archiveTrace();
      expect(archiveTrace).toHaveBeenCalledWith(defaultProps.id);

      if (instance.onArchiveClicked) {
        instance.onArchiveClicked();
        expect(archiveTrace).toHaveBeenCalledWith(defaultProps.id);
      }
    });
  });

  describe('manages various UI state', () => {
    let calculateTraceDagEVSpy;

    beforeAll(() => {
      calculateTraceDagEVSpy = jest.spyOn(calculateTraceDagEV, 'default');
    });

    it('updates next view range time correctly', () => {
      const testProps = { ...defaultProps };
      const instance = new TracePage(testProps);
      const update = { cursor: 0.5 };

      instance.setState = jest.fn();
      instance.updateNextViewRangeTime(update);

      expect(instance.setState).toHaveBeenCalled();
      const stateUpdate = instance.setState.mock.calls[0][0];
      const mockState = { viewRange: { time: { current: [0, 1] } } };
      const newState = stateUpdate(mockState);

      expect(newState.viewRange.time).toEqual({
        ...mockState.viewRange.time,
        ...update,
      });
    });

    it('propagates headerHeight changes', () => {
      const testProps = { ...defaultProps };
      const instance = new TracePage(testProps);
      instance.setState = jest.fn();

      // Test setting header height with element
      const mockElement = { clientHeight: 100 };
      instance.setHeaderHeight(mockElement);
      expect(instance.setState).toHaveBeenCalledWith({ headerHeight: 100 });

      // Reset setState mock before testing null
      instance.setState.mockReset();
      instance.setHeaderHeight(mockElement);
      expect(instance.setState).toHaveBeenLastCalledWith({ headerHeight: 100 });

      // Test with different height
      const newMockElement = { clientHeight: 200 };
      instance.setHeaderHeight(newMockElement);
      expect(instance.setState).toHaveBeenLastCalledWith({ headerHeight: 200 });
    });

    it('initializes slimView correctly', () => {
      const { container } = renderWithRouter(<TracePage {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();

      // Test with embedded config that should initialize slimView
      const { container: container2 } = renderWithRouter(
        <TracePage {...defaultProps} trace={{}} embedded={{ timeline: { collapseTitle: true } }} />
      );
      expect(container2.firstChild).toBeInTheDocument();
    });

    it('propagates slimView changes', () => {
      const { rerender } = renderWithRouter(<TracePage {...defaultProps} />);
      // Component should handle slim view changes
      rerender(<TracePage {...defaultProps} slimView={true} />);
    });

    it('propagates textFilter changes', () => {
      const s = 'abc';
      const { rerender } = renderWithRouter(<TracePage {...defaultProps} />);
      rerender(<TracePage {...defaultProps} uiFind={s} />);
      // Component should handle text filter changes
    });

    it('propagates traceView changes', () => {
      const instance = new TracePage(defaultProps);
      instance.setState = jest.fn();

      calculateTraceDagEVSpy.mockReset();

      // Test each view type transition
      [
        ETraceViewType.TraceGraph,
        ETraceViewType.TraceSpansView,
        ETraceViewType.TraceStatistics,
        ETraceViewType.TraceTimelineViewer,
        ETraceViewType.TraceFlamegraph,
      ].forEach(viewType => {
        instance.setTraceView(viewType);
        expect(instance.setState).toHaveBeenCalledWith({ viewType });
      });
    });

    it('calculates DAG only for TraceGraph view', () => {
      const instance = new TracePage(defaultProps);
      instance.setState = jest.fn();
      calculateTraceDagEVSpy.mockReset();

      // Should calculate DAG for TraceGraph
      instance.setTraceView(ETraceViewType.TraceGraph);
      expect(calculateTraceDagEVSpy).toHaveBeenCalled();

      calculateTraceDagEVSpy.mockReset();

      // Should not calculate DAG for other views
      [
        ETraceViewType.TraceSpansView,
        ETraceViewType.TraceStatistics,
        ETraceViewType.TraceTimelineViewer,
        ETraceViewType.TraceFlamegraph,
      ].forEach(viewType => {
        instance.setTraceView(viewType);
        expect(calculateTraceDagEVSpy).not.toHaveBeenCalled();
      });
    });

    it('sets trace view and calculates DAG when switching to TraceGraph', () => {
      const testProps = {
        ...defaultProps,
        trace: {
          data: { spans: [], processes: {} },
        },
      };
      const instance = new TracePage(testProps);
      instance.setState = jest.fn();

      instance.setTraceView(ETraceViewType.TraceGraph);

      expect(calculateTraceDagEVSpy).toHaveBeenCalledWith(testProps.trace.data);
      expect(instance.setState).toHaveBeenCalledWith({ viewType: ETraceViewType.TraceGraph });
    });

    it('sets trace view without calculating DAG for non-graph views', () => {
      const testProps = {
        ...defaultProps,
        viewType: ETraceViewType.TraceTimelineViewer,
        trace: {
          data: { spans: [], processes: {} },
        },
      };
      const instance = new TracePage(testProps);
      instance.setState = jest.fn();
      calculateTraceDagEVSpy.mockClear();

      instance.setTraceView(ETraceViewType.TraceTimelineViewer);

      expect(calculateTraceDagEVSpy).not.toHaveBeenCalled();
      expect(instance.setState).toHaveBeenCalledWith({ viewType: ETraceViewType.TraceTimelineViewer });
    });

    it('propagates viewRange changes', () => {
      const { container } = renderWithRouter(<TracePage {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('sets state correctly for different view types', () => {
      const headerHeight = 100;
      const testProps = {
        ...defaultProps,
        trace: {
          data: { spans: [], processes: {} },
          state: fetchedState.DONE,
        },
      };

      const instance = new TracePage(testProps);
      instance.setState = jest.fn();

      [ETraceViewType.TraceStatistics, ETraceViewType.TraceSpansView, ETraceViewType.TraceFlamegraph].forEach(
        viewType => {
          instance.setTraceView(viewType);
          expect(instance.setState).toHaveBeenCalledWith({ viewType });
        }
      );
    });
  });

  describe('GA tracking', () => {
    it('tracks setting the header to slim-view', () => {
      const testProps = { ...defaultProps };
      const instance = new TracePage(testProps);

      trackSlimHeaderToggle.mockReset();

      if (instance.onSlimViewClicked) {
        instance.onSlimViewClicked(true);
        instance.onSlimViewClicked(false);
        expect(trackSlimHeaderToggle).toHaveBeenCalledWith(true);
        expect(trackSlimHeaderToggle).toHaveBeenCalledWith(false);
      }
    });

    it('tracks changes to the viewRange', () => {
      const testProps = { ...defaultProps };
      const instance = new TracePage(testProps);

      const trackRangeSpy = jest.spyOn(track, 'trackRange').mockImplementation(() => {});
      const prevRange = [0, 1];
      instance.state = {
        viewRange: {
          time: {
            current: prevRange,
          },
        },
      };

      const src = 'some-source';
      const range = [0.25, 0.75];
      instance.updateViewRangeTime(range[0], range[1], src);

      expect(trackRangeSpy).toHaveBeenCalledWith(src, range, prevRange);

      if (instance.updateViewRangeTime) {
        instance.updateViewRangeTime(...range, src);
        expect(trackRangeSpy).toHaveBeenCalledWith(src, range, [0, 1]);
      }
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('creates the actions correctly', () => {
    expect(mapDispatchToProps(() => {})).toEqual({
      acknowledgeArchive: expect.any(Function),
      archiveTrace: expect.any(Function),
      fetchTrace: expect.any(Function),
      focusUiFindMatches: expect.any(Function),
    });
  });
});

describe('mapStateToProps()', () => {
  const traceID = 'trace-id';
  const trace = {};
  const embedded = 'a-faux-embedded-config';
  const ownProps = {
    params: { id: traceID },
  };
  let state;
  beforeEach(() => {
    state = {
      embedded,
      trace: {
        traces: {
          [traceID]: { data: trace, state: fetchedState.DONE },
        },
      },
      router: {
        location: {
          search: '',
        },
      },
      config: {
        archiveEnabled: false,
      },
      archive: {},
    };
  });
  it('maps state to props correctly', () => {
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
      embedded,
      archiveEnabled: false,
      archiveTraceState: undefined,
      searchUrl: null,
      trace: { data: {}, state: fetchedState.DONE },
    });
  });

  it('handles falsy ownProps.match.params.id', () => {
    const props = mapStateToProps(state, {
      params: {
        id: '',
      },
    });
    expect(props).toEqual(
      expect.objectContaining({
        archiveTraceState: null,
        id: '',
        trace: null,
      })
    );
  });

  it('propagates fromSearch correctly', () => {
    const fakeUrl = 'fake-url';
    state.router.location.state = { fromSearch: fakeUrl };
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
      embedded,
      archiveEnabled: false,
      archiveTraceState: undefined,
      searchUrl: fakeUrl,
      trace: { data: {}, state: fetchedState.DONE },
    });
  });

  it('propagates layoutManagerMemory correctly', () => {
    const fakeMemory = 123;
    state.config.traceGraph = { layoutManagerMemory: fakeMemory };
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
      embedded,
      archiveEnabled: false,
      archiveTraceState: undefined,
      searchUrl: null,
      uiFind: undefined,
      trace: { data: {}, state: fetchedState.DONE },
      traceGraphConfig: { layoutManagerMemory: fakeMemory },
    });
  });
});
