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
// mock these to enable mount()
jest.mock('./SpanGraph');
jest.mock('./TracePageHeader.track');
jest.mock('./TraceTimelineViewer');

import React from 'react';
import sinon from 'sinon';
import { shallow, mount } from 'enzyme';

import TracePage, {
  makeShortcutCallbacks,
  mapDispatchToProps,
  mapStateToProps,
  shortcutConfig,
  VIEW_MIN_RANGE,
} from './index';
import * as track from './index.track';
import { reset as resetShortcuts } from './keyboard-shortcuts';
import { cancel as cancelScroll } from './scroll-page';
import SpanGraph from './SpanGraph';
import TracePageHeader from './TracePageHeader';
import { trackSlimHeaderToggle } from './TracePageHeader.track';
import TraceTimelineViewer from './TraceTimelineViewer';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import traceGenerator from '../../demo/trace-generators';
import transformTraceData from '../../model/transform-trace-data';

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
  TraceTimelineViewer.prototype.shouldComponentUpdate.mockReturnValue(false);

  const trace = transformTraceData(traceGenerator.trace({}));
  const defaultProps = {
    trace,
    fetchTrace() {},
    id: trace.traceID,
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TracePage {...defaultProps} />);
  });

  it('renders a <TracePageHeader>', () => {
    expect(wrapper.find(TracePageHeader).get(0)).toBeTruthy();
  });

  it('renders a <SpanGraph>', () => {
    expect(wrapper.find(SpanGraph).length).toBe(1);
  });

  it('renders an empty page when not provided a trace', () => {
    wrapper.setProps({ trace: null });
    const isEmpty = wrapper.matchesElement(<section />);
    expect(isEmpty).toBe(true);
  });

  it('renders an error message when given an error', () => {
    wrapper.setProps({ trace: new Error('some-error') });
    expect(wrapper.find(ErrorMessage).length).toBe(1);
  });

  it('renders a loading indicator when loading', () => {
    wrapper.setProps({ trace: null, loading: true });
    const loading = wrapper.find(LoadingIndicator);
    expect(loading.length).toBe(1);
  });

  it('fetches the trace if necessary', () => {
    const fetchTrace = sinon.spy();
    wrapper = mount(<TracePage {...defaultProps} trace={null} fetchTrace={fetchTrace} />);
    expect(fetchTrace.called).toBeTruthy();
    expect(fetchTrace.calledWith(trace.traceID)).toBe(true);
  });

  it("doesn't fetch the trace if already present", () => {
    const fetchTrace = sinon.spy();
    wrapper = mount(<TracePage {...defaultProps} fetchTrace={fetchTrace} />);
    expect(fetchTrace.called).toBeFalsy();
  });

  it('resets the view range when the trace changes', () => {
    const altTrace = { ...trace, traceID: 'some-other-id' };
    // mount because `.componentDidUpdate()`
    wrapper = mount(<TracePage {...defaultProps} />);
    wrapper.setState({ viewRange: { time: [0.2, 0.8] } });
    wrapper.setProps({ trace: altTrace });
    expect(wrapper.state('viewRange')).toEqual({ time: { current: [0, 1] } });
  });

  it('updates _scrollManager when recieving props', () => {
    wrapper = shallow(<TracePage {...defaultProps} trace={null} />);
    const scrollManager = wrapper.instance()._scrollManager;
    scrollManager.setTrace = jest.fn();
    wrapper.setProps({ trace });
    expect(scrollManager.setTrace.mock.calls).toEqual([[trace]]);
  });

  it('performs misc cleanup when unmounting', () => {
    wrapper = shallow(<TracePage {...defaultProps} trace={null} />);
    const scrollManager = wrapper.instance()._scrollManager;
    scrollManager.destroy = jest.fn();
    wrapper.unmount();
    expect(scrollManager.destroy.mock.calls).toEqual([[]]);
    expect(resetShortcuts.mock.calls).toEqual([[]]);
    expect(cancelScroll.mock.calls).toEqual([[]]);
  });

  describe('_adjustViewRange()', () => {
    let instance;
    let time;
    let state;

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

    beforeEach(() => {
      wrapper = shallow(<TracePage {...defaultProps} />);
      instance = wrapper.instance();
      time = { current: null };
      state = { viewRange: { time } };
    });

    cases.forEach(testCase => {
      const { message, timeViewRange, change, result } = testCase;
      it(message, () => {
        time.current = timeViewRange;
        wrapper.setState(state);
        instance._adjustViewRange(...change);
        const { current } = wrapper.state('viewRange').time;
        expect(current).toEqual(result);
      });
    });
  });

  describe('manages various UI state', () => {
    let header;
    let spanGraph;
    let timeline;

    function refreshWrappers() {
      header = wrapper.find(TracePageHeader);
      spanGraph = wrapper.find(SpanGraph);
      timeline = wrapper.find(TraceTimelineViewer);
    }

    beforeEach(() => {
      wrapper = mount(<TracePage {...defaultProps} />);
      // use the method directly because it is a `ref` prop
      wrapper.instance().setHeaderHeight({ clientHeight: 1 });
      wrapper.update();
      refreshWrappers();
    });

    it('propagates headerHeight changes', () => {
      const h = 100;
      const { setHeaderHeight } = wrapper.instance();
      // use the method directly because it is a `ref` prop
      setHeaderHeight({ clientHeight: h });
      wrapper.update();
      let sections = wrapper.find('section');
      expect(sections.length).toBe(1);
      const section = sections.first();
      expect(section.prop('style')).toEqual({ paddingTop: h });
      expect(section.containsMatchingElement(<TraceTimelineViewer />)).toBe(true);
      setHeaderHeight(null);
      wrapper.update();
      sections = wrapper.find('section');
      expect(sections.length).toBe(0);
    });

    it('propagates textFilter changes', () => {
      const s = 'abc';
      const { updateTextFilter } = header.props();
      expect(header.prop('textFilter')).toBe('');
      updateTextFilter(s);
      wrapper.update();
      refreshWrappers();
      expect(header.prop('textFilter')).toBe(s);
      expect(timeline.prop('textFilter')).toBe(s);
    });

    it('propagates slimView changes', () => {
      const { onSlimViewClicked } = header.props();
      expect(header.prop('slimView')).toBe(false);
      expect(spanGraph.type()).toBeDefined();
      onSlimViewClicked(true);
      wrapper.update();
      refreshWrappers();
      expect(header.prop('slimView')).toBe(true);
      expect(spanGraph.length).toBe(0);
    });

    it('propagates viewRange changes', () => {
      const viewRange = {
        time: { current: [0, 1] },
      };
      const cursor = 123;
      const current = [0.25, 0.75];
      const { updateViewRangeTime, updateNextViewRangeTime } = spanGraph.props();
      expect(spanGraph.prop('viewRange')).toEqual(viewRange);
      expect(timeline.prop('viewRange')).toEqual(viewRange);
      updateNextViewRangeTime({ cursor });
      wrapper.update();
      refreshWrappers();
      viewRange.time.cursor = cursor;
      expect(spanGraph.prop('viewRange')).toEqual(viewRange);
      expect(timeline.prop('viewRange')).toEqual(viewRange);
      updateViewRangeTime(...current);
      wrapper.update();
      refreshWrappers();
      viewRange.time = { current };
      expect(spanGraph.prop('viewRange')).toEqual(viewRange);
      expect(timeline.prop('viewRange')).toEqual(viewRange);
    });
  });

  describe('GA tracking', () => {
    let header;
    let spanGraph;

    function refreshWrappers() {
      header = wrapper.find(TracePageHeader);
      spanGraph = wrapper.find(SpanGraph);
    }

    beforeEach(() => {
      wrapper = mount(<TracePage {...defaultProps} />);
      // use the method directly because it is a `ref` prop
      wrapper.instance().setHeaderHeight({ clientHeight: 1 });
      wrapper.update();
      refreshWrappers();
    });

    it('tracks setting the header to slim-view', () => {
      const { onSlimViewClicked } = header.props();
      trackSlimHeaderToggle.mockReset();
      onSlimViewClicked(true);
      onSlimViewClicked(false);
      expect(trackSlimHeaderToggle.mock.calls).toEqual([[true], [false]]);
    });

    it('tracks setting or clearing the filter', () => {
      const { updateTextFilter } = header.props();
      track.trackFilter.mockClear();
      updateTextFilter('abc');
      updateTextFilter('');
      expect(track.trackFilter.mock.calls).toEqual([['abc'], ['']]);
    });

    it('tracks changes to the viewRange', () => {
      const src = 'some-source';
      const { updateViewRangeTime } = spanGraph.props();
      track.trackRange.mockClear();
      const range = [0.25, 0.75];
      updateViewRangeTime(...range, src);
      expect(track.trackRange.mock.calls).toEqual([[src, range, [0, 1]]]);
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('creates the actions correctly', () => {
    expect(mapDispatchToProps(() => {})).toEqual({
      fetchTrace: expect.any(Function),
      acknowledgeArchive: expect.any(Function),
      archiveTrace: expect.any(Function),
    });
  });
});

describe('mapStateToProps()', () => {
  it('maps state to props correctly', () => {
    const id = 'abc';
    const trace = {};
    const state = {
      trace: {
        loading: false,
        traces: {
          [id]: trace,
        },
      },
      config: {
        archiveEnabled: false,
      },
      archive: {},
    };
    const ownProps = {
      match: {
        params: { id },
      },
    };
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id,
      trace,
      loading: state.trace.loading,
      archiveEnabled: false,
      archiveTraceState: undefined,
    });
  });
});
