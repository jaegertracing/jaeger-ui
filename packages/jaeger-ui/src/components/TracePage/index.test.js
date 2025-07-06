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

/* eslint-disable import/first */

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

jest.mock('./ScrollManager', () => {
  return jest.fn().mockImplementation(() => ({
    setTrace: jest.fn(),
    setAccessors: jest.fn(),
    scrollToNextVisibleSpan: jest.fn(),
    scrollToPrevVisibleSpan: jest.fn(),
    scrollToFirstVisibleSpan: jest.fn(),
    scrollPageDown: jest.fn(),
    scrollPageUp: jest.fn(),
    destroy: jest.fn(),
  }));
});

jest.mock('./ArchiveNotifier', () => {
  return function MockArchiveNotifier({ acknowledge, archivedState }) {
    return (
      <div data-testid="archive-notifier">
        <button onClick={acknowledge} data-testid="acknowledge-archive">
          Acknowledge
        </button>
      </div>
    );
  };
});

jest.mock('./TracePageHeader', () => {
  const React = require('react');
  return React.forwardRef(function MockTracePageHeader(props, ref) {
    return (
      <div data-testid="trace-page-header" ref={ref}>
        <button onClick={props.focusUiFindMatches} data-testid="focus-matches">
          Focus Matches
        </button>
        <button onClick={props.nextResult} data-testid="next-result">
          Next
        </button>
        <button onClick={props.prevResult} data-testid="prev-result">
          Previous
        </button>
        <button onClick={props.onArchiveClicked} data-testid="archive-trace">
          Archive
        </button>
        <button onClick={() => props.onSlimViewClicked(!props.slimView)} data-testid="toggle-slim-view">
          Toggle Slim View
        </button>
        <button onClick={() => props.onTraceViewChange('TraceGraph')} data-testid="change-to-graph">
          Graph View
        </button>
        <button onClick={() => props.onTraceViewChange('TraceSpansView')} data-testid="change-to-spans">
          Spans View
        </button>
        <button onClick={() => props.onTraceViewChange('TraceStatistics')} data-testid="change-to-stats">
          Statistics View
        </button>
        <button
          onClick={() => props.onTraceViewChange('TraceTimelineViewer')}
          data-testid="change-to-timeline"
        >
          Timeline View
        </button>
        <button onClick={() => props.onTraceViewChange('TraceFlamegraph')} data-testid="change-to-flamegraph">
          Flamegraph View
        </button>
        <button onClick={() => props.clearSearch()} data-testid="clear-search">
          Clear Search
        </button>
        <button
          onClick={() => props.updateNextViewRangeTime({ cursor: 123 })}
          data-testid="update-next-view-range"
        >
          Update Next View Range
        </button>
        <span data-testid="slim-view">{props.slimView ? 'true' : 'false'}</span>
        <span data-testid="view-type">{props.viewType}</span>
        <span data-testid="result-count">{props.resultCount}</span>
        <span data-testid="can-collapse">{props.canCollapse ? 'true' : 'false'}</span>
        <span data-testid="hide-map">{props.hideMap ? 'true' : 'false'}</span>
        <span data-testid="hide-summary">{props.hideSummary ? 'true' : 'false'}</span>
        <span data-testid="show-archive-button">{props.showArchiveButton ? 'true' : 'false'}</span>
        <span data-testid="show-shortcuts-help">{props.showShortcutsHelp ? 'true' : 'false'}</span>
        <span data-testid="show-standalone-link">{props.showStandaloneLink ? 'true' : 'false'}</span>
        <span data-testid="show-view-options">{props.showViewOptions ? 'true' : 'false'}</span>
        <span data-testid="text-filter">{props.textFilter || ''}</span>
      </div>
    );
  });
});

jest.mock('./TraceTimelineViewer', () => {
  return function MockTraceTimelineViewer(props) {
    return (
      <div data-testid="trace-timeline-viewer">
        <button
          onClick={() => props.updateViewRangeTime(0.25, 0.75, 'test-src')}
          data-testid="update-view-range"
        >
          Update View Range
        </button>
        <button
          onClick={() => props.updateNextViewRangeTime({ cursor: 123 })}
          data-testid="update-next-view-range"
        >
          Update Next View Range
        </button>
        <button onClick={props.registerAccessors} data-testid="register-accessors">
          Register Accessors
        </button>
        <button onClick={props.scrollToFirstVisibleSpan} data-testid="scroll-to-first-visible-span">
          Scroll To First Visible Span
        </button>
        <span data-testid="view-range">{JSON.stringify(props.viewRange)}</span>
      </div>
    );
  };
});

jest.mock('./TracePageHeader/SpanGraph', () => {
  return function MockSpanGraph(props) {
    return (
      <div data-testid="span-graph">
        <button
          onClick={() => props.updateViewRangeTime(0.25, 0.75, 'test-src')}
          data-testid="span-graph-update-view-range"
        >
          Update View Range
        </button>
        <button
          onClick={() => props.updateNextViewRangeTime({ cursor: 123 })}
          data-testid="span-graph-update-next-view-range"
        >
          Update Next View Range
        </button>
        <span data-testid="span-graph-view-range">{JSON.stringify(props.viewRange)}</span>
      </div>
    );
  };
});

jest.mock('./TraceGraph/TraceGraph', () => {
  return function MockTraceGraph(props) {
    return <div data-testid="trace-graph">Graph View</div>;
  };
});

jest.mock('./TraceStatistics/index', () => {
  return function MockTraceStatistics(props) {
    return <div data-testid="trace-statistics">Statistics View</div>;
  };
});

jest.mock('./TraceSpanView/index', () => {
  return function MockTraceSpanView(props) {
    return <div data-testid="trace-span-view">Span View</div>;
  };
});

jest.mock('./TraceFlamegraph/index', () => {
  return function MockTraceFlamegraph(props) {
    return <div data-testid="trace-flamegraph">Flamegraph View</div>;
  };
});

jest.mock('../common/LoadingIndicator', () => {
  return function MockLoadingIndicator() {
    return <div data-testid="loading-indicator">Loading...</div>;
  };
});

jest.mock('../common/ErrorMessage', () => {
  return function MockErrorMessage({ error }) {
    return <div data-testid="error-message">{error}</div>;
  };
});

import React from 'react';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import sinon from 'sinon';

import {
  makeShortcutCallbacks,
  mapDispatchToProps,
  mapStateToProps,
  shortcutConfig,
  TracePageImpl as TracePage,
  VIEW_MIN_RANGE,
} from './index';
import * as track from './index.track';
import { reset as resetShortcuts } from './keyboard-shortcuts';
import { cancel as cancelScroll } from './scroll-page';
import * as calculateTraceDagEV from './TraceGraph/calculateTraceDagEV';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import * as getUiFindVertexKeys from '../TraceDiff/TraceDiffGraph/traceDiffGraphUtils';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
import transformTraceData from '../../model/transform-trace-data';
import filterSpansSpy from '../../utils/filter-spans';
import updateUiFindSpy from '../../utils/update-ui-find';
import memoizedTraceCriticalPath from './CriticalPath/index';

jest.mock('./CriticalPath/index', () => {
  return jest.fn().mockReturnValue([{ spanID: 'test-span-id' }]);
});

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

  let wrapper;
  let tracePageRef = null;

  beforeAll(() => {
    filterSpansSpy.mockReturnValue(new Set());
  });

  beforeEach(() => {
    tracePageRef = null;
    wrapper = render(
      <TracePage
        ref={ref => {
          tracePageRef = ref;
        }}
        {...defaultProps}
      />
    );
    filterSpansSpy.mockClear();
    updateUiFindSpy.mockClear();
    track.trackRange.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('clearSearch', () => {
    it('calls updateUiFind with expected kwargs when clearing search', () => {
      expect(updateUiFindSpy).not.toHaveBeenCalled();
      wrapper.rerender(<TracePage {...defaultProps} id={notDefaultPropsId} />);
      expect(updateUiFindSpy).toHaveBeenCalledWith({
        history: defaultProps.history,
        location: defaultProps.location,
        trackFindFunction: track.trackFilter,
      });
    });

    it('clears search when button is clicked', () => {
      updateUiFindSpy.mockClear();
      fireEvent.click(screen.getByTestId('clear-search'));
      expect(updateUiFindSpy).toHaveBeenCalled();
    });

    it('blurs _searchBar.current when _searchBar.current exists', () => {
      const blur = jest.fn();
      expect(tracePageRef).toBeTruthy();
      tracePageRef._searchBar.current = { blur };
      tracePageRef.clearSearch();
      expect(blur).toHaveBeenCalledTimes(1);
    });

    it('handles null _searchBar.current', () => {
      expect(tracePageRef).toBeTruthy();
      tracePageRef._searchBar.current = null;
      tracePageRef.clearSearch();
    });
  });

  describe('focusOnSearchBar', () => {
    it('focuses on search bar when there is a search bar', () => {
      const focus = jest.fn();
      expect(tracePageRef).toBeTruthy();
      tracePageRef._searchBar.current = { focus };
      tracePageRef.focusOnSearchBar();
      expect(focus).toHaveBeenCalledTimes(1);
    });

    it('handles absent search bar', () => {
      expect(tracePageRef).toBeTruthy();
      tracePageRef._searchBar.current = null;
      tracePageRef.focusOnSearchBar();
    });
  });

  describe('_adjustViewRange', () => {
    it('handles standard view range adjustments', async () => {
      expect(tracePageRef).toBeTruthy();
      await act(async () => {
        tracePageRef.setState({
          viewRange: {
            time: {
              current: [0.25, 0.75],
            },
          },
        });
      });

      await act(async () => {
        tracePageRef._adjustViewRange(0.1, -0.1, 'test-adjust');
      });

      expect(tracePageRef.state.viewRange.time.current).toEqual([0.35, 0.65]);
      expect(track.trackRange).toHaveBeenCalledWith('test-adjust', [0.35, 0.65], [0.25, 0.75]);
    });

    it('handles view range adjustments with negative start change and negative end change', async () => {
      expect(tracePageRef).toBeTruthy();
      await act(async () => {
        tracePageRef.setState({
          viewRange: {
            time: {
              current: [0.495, 0.505],
            },
          },
        });
      });

      await act(async () => {
        tracePageRef._adjustViewRange(-0.001, -0.005, 'test-adjust');
      });

      expect(
        tracePageRef.state.viewRange.time.current[1] - tracePageRef.state.viewRange.time.current[0]
      ).toBeGreaterThanOrEqual(VIEW_MIN_RANGE);
    });

    it('handles view range adjustments with positive start change and positive end change', async () => {
      expect(tracePageRef).toBeTruthy();
      await act(async () => {
        tracePageRef.setState({
          viewRange: {
            time: {
              current: [0.495, 0.505],
            },
          },
        });
      });

      await act(async () => {
        tracePageRef._adjustViewRange(0.005, 0.001, 'test-adjust');
      });

      expect(
        tracePageRef.state.viewRange.time.current[1] - tracePageRef.state.viewRange.time.current[0]
      ).toBeGreaterThanOrEqual(VIEW_MIN_RANGE);
    });

    it('handles view range adjustments with contracting from both sides', async () => {
      expect(tracePageRef).toBeTruthy();
      await act(async () => {
        tracePageRef.setState({
          viewRange: {
            time: {
              current: [0.495, 0.505],
            },
          },
        });
      });

      await act(async () => {
        tracePageRef._adjustViewRange(0.005, -0.005, 'test-adjust');
      });

      const range = tracePageRef.state.viewRange.time.current;
      expect(range[1] - range[0]).toBeGreaterThanOrEqual(VIEW_MIN_RANGE);

      const center = 0.495 + (0.505 - 0.495) / 2;
      const newCenter = range[0] + (range[1] - range[0]) / 2;
      expect(newCenter).toBeCloseTo(center, 5);
    });
  });

  describe('viewing uiFind matches', () => {
    describe('focusUiFindMatches', () => {
      let trackFocusSpy;

      beforeAll(() => {
        trackFocusSpy = jest.spyOn(track, 'trackFocusMatches');
      });

      beforeEach(() => {
        defaultProps.focusUiFindMatches.mockReset();
        trackFocusSpy.mockReset();
      });

      it('calls props.focusUiFindMatches with props.trace.data and uiFind when props.trace.data is present', () => {
        const uiFind = 'test ui find';
        wrapper.rerender(<TracePage {...defaultProps} uiFind={uiFind} />);
        fireEvent.click(screen.getByTestId('focus-matches'));
        expect(defaultProps.focusUiFindMatches).toHaveBeenCalledWith(defaultProps.trace.data, uiFind);
        expect(trackFocusSpy).toHaveBeenCalledTimes(1);
      });

      it('handles when props.trace.data is absent', () => {
        const emptyTraceData = transformTraceData({
          traceID: 'empty-trace',
          spans: [],
          processes: {},
          warnings: [],
        });
        const emptyTrace = { data: emptyTraceData, state: fetchedState.DONE };
        wrapper.rerender(<TracePage {...defaultProps} trace={emptyTrace} />);
        fireEvent.click(screen.getByTestId('focus-matches'));
        expect(defaultProps.focusUiFindMatches).toHaveBeenCalledWith(emptyTraceData, undefined);
        expect(trackFocusSpy).toHaveBeenCalledTimes(1);
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
        fireEvent.click(screen.getByTestId('next-result'));
        expect(trackNextSpy).toHaveBeenCalledTimes(1);
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
        fireEvent.click(screen.getByTestId('prev-result'));
        expect(trackPrevSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('uses props.uiFind, props.trace.traceID, and props.trace.spans.length to create filterSpans memo cache key', () => {
    expect(filterSpansSpy).toHaveBeenCalledTimes(0);

    const uiFind = 'uiFind';
    wrapper.rerender(<TracePage {...defaultProps} uiFind={uiFind} />);
    wrapper.rerender(<TracePage {...defaultProps} uiFind={uiFind} id={notDefaultPropsId} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(1);
    expect(filterSpansSpy).toHaveBeenLastCalledWith(uiFind, defaultProps.trace.data.spans);

    const newTrace = { ...defaultProps.trace, traceID: `not-${defaultProps.trace.traceID}` };
    wrapper.rerender(<TracePage {...defaultProps} uiFind={uiFind} trace={newTrace} id={defaultProps.id} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(2);
    expect(filterSpansSpy).toHaveBeenLastCalledWith(uiFind, newTrace.data.spans);

    newTrace.data.spans.splice(0, newTrace.data.spans.length / 2);
    wrapper.rerender(<TracePage {...defaultProps} uiFind={uiFind} trace={newTrace} id={notDefaultPropsId} />);
    wrapper.rerender(<TracePage {...defaultProps} uiFind={uiFind} trace={newTrace} id={defaultProps.id} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(3);
    expect(filterSpansSpy).toHaveBeenLastCalledWith(uiFind, newTrace.data.spans);
  });

  it('renders a a loading indicator when not provided a fetched trace', () => {
    wrapper.rerender(<TracePage {...defaultProps} trace={null} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders an error message when given an error', () => {
    wrapper.rerender(<TracePage {...defaultProps} trace={new Error('some-error')} />);
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('renders a loading indicator when loading', () => {
    wrapper.rerender(<TracePage {...defaultProps} trace={null} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('forces lowercase id', () => {
    const replaceMock = jest.fn();
    const upperCaseId = trace.traceID.toUpperCase();
    const props = {
      ...defaultProps,
      id: upperCaseId,
      history: {
        replace: replaceMock,
      },
    };

    cleanup();
    render(<TracePage {...props} />);

    expect(replaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining(trace.traceID.toLowerCase()),
      })
    );
  });

  it('fetches the trace if necessary', () => {
    const fetchTrace = sinon.spy();
    wrapper.rerender(<TracePage {...defaultProps} trace={null} fetchTrace={fetchTrace} />);
    expect(fetchTrace.called).toBeTruthy();
    expect(fetchTrace.calledWith(trace.traceID)).toBe(true);
  });

  it("doesn't fetch the trace if already present", () => {
    const fetchTrace = sinon.spy();
    wrapper.rerender(<TracePage {...defaultProps} fetchTrace={fetchTrace} />);
    expect(fetchTrace.called).toBeFalsy();
  });

  it('resets the view range when the trace changes', () => {
    const altTrace = { ...trace, traceID: 'some-other-id' };

    expect(tracePageRef).toBeTruthy();
    tracePageRef.setState({
      viewRange: {
        time: {
          current: [0.25, 0.75],
        },
      },
    });

    wrapper.rerender(
      <TracePage
        ref={ref => {
          tracePageRef = ref;
        }}
        {...defaultProps}
        id={altTrace.traceID}
        trace={{ data: altTrace, state: fetchedState.DONE }}
      />
    );

    expect(tracePageRef.state.viewRange).toEqual({
      time: {
        current: [0, 1],
      },
    });
  });

  it('updates _scrollManager when recieving props', () => {
    expect(tracePageRef).toBeTruthy();
    const scrollManager = tracePageRef._scrollManager;

    const setTraceSpy = jest.spyOn(scrollManager, 'setTrace');
    const newTrace = transformTraceData(traceGenerator.trace({ numberOfSpans: 5 }));
    wrapper.rerender(
      <TracePage
        ref={ref => {
          tracePageRef = ref;
        }}
        {...defaultProps}
        trace={{ data: newTrace, state: fetchedState.DONE }}
      />
    );

    expect(setTraceSpy).toHaveBeenCalledWith(newTrace);
  });

  it('performs misc cleanup when unmounting', () => {
    resetShortcuts.mockReset();
    cancelScroll.mockReset();

    expect(tracePageRef).toBeTruthy();
    const scrollManager = tracePageRef._scrollManager;

    const destroySpy = jest.spyOn(scrollManager, 'destroy');

    wrapper.unmount();

    expect(destroySpy).toHaveBeenCalled();
    expect(resetShortcuts).toHaveBeenCalled();
    expect(cancelScroll).toHaveBeenCalled();
  });

  describe('TracePageHeader props', () => {
    describe('canCollapse', () => {
      it('is true if !embedded', () => {
        expect(screen.getByTestId('can-collapse')).toHaveTextContent('true');
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
            cleanup();
            wrapper = render(
              <TracePage
                ref={ref => {
                  tracePageRef = ref;
                }}
                {...defaultProps}
                embedded={embedded}
              />
            );
            expect(screen.getByTestId('can-collapse')).toHaveTextContent(
              !hideSummary || !hideMinimap ? 'true' : 'false'
            );
          });
        });
      });
    });

    describe('calculates hideMap correctly', () => {
      it('is true if on traceGraphView', () => {
        expect(screen.getByTestId('hide-map')).toHaveTextContent('false');

        fireEvent.click(screen.getByTestId('change-to-graph'));
        expect(screen.getByTestId('hide-map')).toHaveTextContent('true');
      });

      it('is true if embedded indicates it should be', () => {
        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            embedded={{
              timeline: {
                hideMinimap: false,
              },
            }}
          />
        );
        expect(screen.getByTestId('hide-map')).toHaveTextContent('false');

        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            embedded={{
              timeline: {
                hideMinimap: true,
              },
            }}
          />
        );
        expect(screen.getByTestId('hide-map')).toHaveTextContent('true');
      });
    });

    describe('calculates hideSummary correctly', () => {
      it('is false if embedded is not provided', () => {
        expect(screen.getByTestId('hide-summary')).toHaveTextContent('false');
      });

      it('is true if embedded indicates it should be', () => {
        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            embedded={{
              timeline: {
                hideSummary: false,
              },
            }}
          />
        );
        expect(screen.getByTestId('hide-summary')).toHaveTextContent('false');

        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            embedded={{
              timeline: {
                hideSummary: true,
              },
            }}
          />
        );
        expect(screen.getByTestId('hide-summary')).toHaveTextContent('true');
      });
    });

    describe('showArchiveButton', () => {
      it('is true when not embedded and archive is enabled', () => {
        [{ timeline: {} }, undefined].forEach(embedded => {
          [true, false].forEach(archiveEnabled => {
            [{ archiveStorage: false }, { archiveStorage: true }].forEach(storageCapabilities => {
              cleanup();
              wrapper = render(
                <TracePage
                  ref={ref => {
                    tracePageRef = ref;
                  }}
                  {...defaultProps}
                  embedded={embedded}
                  archiveEnabled={archiveEnabled}
                  storageCapabilities={storageCapabilities}
                />
              );
              expect(screen.getByTestId('show-archive-button')).toHaveTextContent(
                !embedded && archiveEnabled && storageCapabilities.archiveStorage ? 'true' : 'false'
              );
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
        expect(screen.getByTestId('result-count')).toHaveTextContent('0');

        const size = 20;
        filterSpansSpy.mockReturnValueOnce({ size });
        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            uiFind="new ui find to bust memo"
          />
        );
        expect(screen.getByTestId('result-count')).toHaveTextContent(size.toString());
      });

      it('is the size of graphFindMatches when available', () => {
        const size = 30;
        getUiFindVertexKeysSpy.mockReturnValueOnce({ size });
        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            uiFind="new ui find to bust memo"
          />
        );
        fireEvent.click(screen.getByTestId('change-to-graph'));
        expect(screen.getByTestId('result-count')).toHaveTextContent(size.toString());
      });

      it('defaults to 0', () => {
        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            uiFind=""
          />
        );
        expect(screen.getByTestId('result-count')).toHaveTextContent('0');

        filterSpansSpy.mockReturnValueOnce(null);
        cleanup();
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            uiFind="truthy uiFind"
          />
        );
        expect(screen.getByTestId('result-count')).toHaveTextContent('0');
      });
    });

    describe('isEmbedded derived props', () => {
      it('toggles derived props when embedded is provided', () => {
        expect(screen.getByTestId('show-shortcuts-help')).toHaveTextContent('true');
        expect(screen.getByTestId('show-standalone-link')).toHaveTextContent('false');
        expect(screen.getByTestId('show-view-options')).toHaveTextContent('true');

        wrapper.rerender(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            embedded={{ timeline: {} }}
          />
        );
        expect(screen.getByTestId('show-shortcuts-help')).toHaveTextContent('false');
        expect(screen.getByTestId('show-standalone-link')).toHaveTextContent('true');
        expect(screen.getByTestId('show-view-options')).toHaveTextContent('false');
      });
    });
  });

  describe('setHeaderHeight method', () => {
    it('sets headerHeight state when element is provided', async () => {
      expect(tracePageRef).toBeTruthy();
      const elm = { clientHeight: 100 };
      await act(async () => {
        tracePageRef.setHeaderHeight(elm);
      });
      expect(tracePageRef.state.headerHeight).toBe(100);
    });

    it('sets headerHeight to null when element is null', async () => {
      expect(tracePageRef).toBeTruthy();
      const elm = { clientHeight: 100 };
      await act(async () => {
        tracePageRef.setHeaderHeight(elm);
      });
      expect(tracePageRef.state.headerHeight).toBe(100);
      await act(async () => {
        tracePageRef.setHeaderHeight(null);
      });
      expect(tracePageRef.state.headerHeight).toBe(null);
    });

    it('does not update state if height is unchanged', async () => {
      expect(tracePageRef).toBeTruthy();
      const elm = { clientHeight: 100 };
      await act(async () => {
        tracePageRef.setHeaderHeight(elm);
      });

      const setStateSpy = jest.spyOn(tracePageRef, 'setState');

      await act(async () => {
        tracePageRef.setHeaderHeight(elm);
      });

      expect(setStateSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateViewRangeTime', () => {
    it('updates the view range time and tracks it', async () => {
      track.trackRange.mockClear();
      expect(tracePageRef).toBeTruthy();

      await act(async () => {
        tracePageRef.setState({
          viewRange: {
            time: {
              current: [0, 1],
            },
          },
        });
      });

      await act(async () => {
        tracePageRef.updateViewRangeTime(0.25, 0.75, 'test-src');
      });

      expect(tracePageRef.state.viewRange.time.current).toEqual([0.25, 0.75]);

      expect(track.trackRange).toHaveBeenCalledWith('test-src', [0.25, 0.75], [0, 1]);
    });

    it('updates view range without tracking when no trackSrc is provided', async () => {
      track.trackRange.mockClear();
      expect(tracePageRef).toBeTruthy();
      await act(async () => {
        tracePageRef.setState({
          viewRange: {
            time: {
              current: [0, 1],
            },
          },
        });
      });

      await act(async () => {
        tracePageRef.updateViewRangeTime(0.25, 0.75);
      });

      expect(tracePageRef.state.viewRange.time.current).toEqual([0.25, 0.75]);

      expect(track.trackRange).not.toHaveBeenCalled();
    });
  });

  describe('updateNextViewRangeTime', () => {
    it('updates the next view range time', async () => {
      expect(tracePageRef).toBeTruthy();

      await act(async () => {
        tracePageRef.setState({
          viewRange: {
            time: {
              current: [0, 1],
            },
          },
        });
      });

      const update = { cursor: 0.5 };
      await act(async () => {
        fireEvent.click(screen.getByTestId('update-next-view-range'));
      });

      expect(tracePageRef.state.viewRange.time.cursor).toBe(123);
    });
  });

  describe('toggleSlimView', () => {
    it('toggles slim view state', () => {
      trackSlimHeaderToggle.mockReset();
      expect(screen.getByTestId('slim-view')).toHaveTextContent('false');

      fireEvent.click(screen.getByTestId('toggle-slim-view'));
      expect(screen.getByTestId('slim-view')).toHaveTextContent('true');
      expect(trackSlimHeaderToggle).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByTestId('toggle-slim-view'));
      expect(screen.getByTestId('slim-view')).toHaveTextContent('false');
      expect(trackSlimHeaderToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('View type rendering', () => {
    beforeEach(async () => {
      expect(tracePageRef).toBeTruthy();
      await act(async () => {
        tracePageRef.setHeaderHeight({ clientHeight: 100 });
      });
    });

    it('renders TraceTimelineViewer when viewType is TraceTimelineViewer', async () => {
      await waitFor(() => {
        expect(screen.queryByTestId('trace-timeline-viewer')).toBeInTheDocument();
      });
    });

    it('renders TraceGraph when viewType is TraceGraph', async () => {
      await act(async () => {
        fireEvent.click(screen.getByTestId('change-to-graph'));
      });
      await waitFor(() => {
        expect(screen.queryByTestId('trace-graph')).toBeInTheDocument();
      });
    });

    it('renders TraceStatistics when viewType is TraceStatistics', async () => {
      await act(async () => {
        fireEvent.click(screen.getByTestId('change-to-stats'));
      });
      await waitFor(() => {
        expect(screen.queryByTestId('trace-statistics')).toBeInTheDocument();
      });
    });

    it('renders TraceSpanView when viewType is TraceSpansView', async () => {
      await act(async () => {
        fireEvent.click(screen.getByTestId('change-to-spans'));
      });
      await waitFor(() => {
        expect(screen.queryByTestId('trace-span-view')).toBeInTheDocument();
      });
    });

    it('renders TraceFlamegraph when viewType is TraceFlamegraph', async () => {
      await act(async () => {
        fireEvent.click(screen.getByTestId('change-to-flamegraph'));
      });
      await waitFor(() => {
        expect(screen.queryByTestId('trace-flamegraph')).toBeInTheDocument();
      });
    });

    it('calculates traceDagEV when switching to TraceGraph', async () => {
      const calculateTraceDagEVSpy = jest.spyOn(calculateTraceDagEV, 'default');
      calculateTraceDagEVSpy.mockClear();

      await act(async () => {
        fireEvent.click(screen.getByTestId('change-to-graph'));
      });

      expect(calculateTraceDagEVSpy).toHaveBeenCalledWith(defaultProps.trace.data);
    });

    it('uses critical path when rendering TraceTimelineViewer', async () => {
      const criticalPathEnabled = true;
      memoizedTraceCriticalPath.mockClear();

      cleanup();
      await act(async () => {
        wrapper = render(
          <TracePage
            ref={ref => {
              tracePageRef = ref;
            }}
            {...defaultProps}
            criticalPathEnabled={criticalPathEnabled}
          />
        );
      });

      expect(tracePageRef).toBeTruthy();
      await act(async () => {
        tracePageRef.setHeaderHeight({ clientHeight: 100 });
      });

      expect(memoizedTraceCriticalPath).toHaveBeenCalledWith(defaultProps.trace.data);
    });
  });

  describe('Archive functionality', () => {
    it('renders ArchiveNotifier if props.archiveEnabled is true', () => {
      expect(screen.queryByTestId('archive-notifier')).not.toBeInTheDocument();

      wrapper.rerender(
        <TracePage
          ref={ref => {
            tracePageRef = ref;
          }}
          {...defaultProps}
          archiveEnabled={true}
        />
      );
      expect(screen.getByTestId('archive-notifier')).toBeInTheDocument();
    });

    it('calls props.acknowledgeArchive when ArchiveNotifier acknowledges', () => {
      const acknowledgeArchive = jest.fn();
      wrapper.rerender(
        <TracePage
          ref={ref => {
            tracePageRef = ref;
          }}
          {...defaultProps}
          acknowledgeArchive={acknowledgeArchive}
          archiveEnabled={true}
        />
      );

      fireEvent.click(screen.getByTestId('acknowledge-archive'));
      expect(acknowledgeArchive).toHaveBeenCalledWith(defaultProps.id);
    });

    it("calls props.archiveTrace when TracePageHeader's archive button is clicked", () => {
      const archiveTrace = jest.fn();
      wrapper.rerender(
        <TracePage
          ref={ref => {
            tracePageRef = ref;
          }}
          {...defaultProps}
          archiveTrace={archiveTrace}
        />
      );

      fireEvent.click(screen.getByTestId('archive-trace'));
      expect(archiveTrace).toHaveBeenCalledWith(defaultProps.id);
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
