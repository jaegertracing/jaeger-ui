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
import { Dropdown } from 'antd';
import { Link } from 'react-router-dom';
import AltViewOptions from './AltViewOptions';
import * as track from './TracePageHeader.track';
import { ETraceViewType } from '../types';

describe('AltViewOptions', () => {
  let trackGanttView;
  let trackGraphView;
  let trackJsonView;
  let trackRawJsonView;
  let trackStatisticsView;

  let wrapper;
  const getLink = text => {
    const menu = shallow(wrapper.find(Dropdown).prop('overlay'));
    const links = menu.find(Link);
    for (let i = 0; i < links.length; i++) {
      const link = links.at(i);
      if (link.children().text() === text) return link;
    }
    const links2 = menu.find('a');
    for (let i = 0; i < links.length; i++) {
      const link = links2.at(i);
      if (link.children().text() === text) return link;
    }
    throw new Error(`Could not find "${text}"`);
  };

  const props = {
    viewType: ETraceViewType.TraceTimelineViewer,
    traceID: 'test trace ID',
    onTraceViewChange: jest.fn(),
  };

  beforeAll(() => {
    trackGanttView = jest.spyOn(track, 'trackGanttView');
    trackGraphView = jest.spyOn(track, 'trackGraphView');
    trackJsonView = jest.spyOn(track, 'trackJsonView');
    trackRawJsonView = jest.spyOn(track, 'trackRawJsonView');
    trackStatisticsView = jest.spyOn(track, 'trackStatisticsView');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = shallow(<AltViewOptions {...props} />);
  });

  it('renders correctly', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('tracks viewing JSONs', () => {
    expect(trackJsonView).not.toHaveBeenCalled();
    getLink('Trace JSON').simulate('click');
    expect(trackJsonView).toHaveBeenCalledTimes(1);

    expect(trackRawJsonView).not.toHaveBeenCalled();
    getLink('Trace JSON (unadjusted)').simulate('click');
    expect(trackRawJsonView).toHaveBeenCalledTimes(1);

    expect(trackJsonView).toHaveBeenCalledTimes(1);
    expect(trackGanttView).not.toHaveBeenCalled();
    expect(trackGraphView).not.toHaveBeenCalled();
  });

  it('track dropdown menu', () => {
    expect(trackGraphView).not.toHaveBeenCalled();
    expect(props.onTraceViewChange).not.toHaveBeenCalled();
    getLink('Trace Graph').simulate('click');
    expect(trackGraphView).toHaveBeenCalledTimes(1);
    expect(props.onTraceViewChange).toHaveBeenCalledTimes(1);
    expect(trackStatisticsView).not.toHaveBeenCalled();
    getLink('Trace Statistics').simulate('click');
    expect(trackStatisticsView).toHaveBeenCalledTimes(1);
    expect(props.onTraceViewChange).toHaveBeenCalledTimes(2);

    wrapper.setProps({ viewType: ETraceViewType.TraceGraph });
    expect(trackGanttView).not.toHaveBeenCalled();
    getLink('Trace Timeline').simulate('click');
    expect(trackGanttView).toHaveBeenCalledTimes(1);
    expect(props.onTraceViewChange).toHaveBeenCalledTimes(3);
    getLink('Trace Statistics').simulate('click');
    expect(trackStatisticsView).toHaveBeenCalledTimes(2);
    expect(props.onTraceViewChange).toHaveBeenCalledTimes(4);

    wrapper.setProps({ viewType: 2 });
    getLink('Trace Timeline').simulate('click');
    expect(trackGanttView).toHaveBeenCalledTimes(2);
    expect(props.onTraceViewChange).toHaveBeenCalledTimes(5);
    getLink('Trace Graph').simulate('click');
    expect(trackGraphView).toHaveBeenCalledTimes(2);
    expect(props.onTraceViewChange).toHaveBeenCalledTimes(6);
  });
});
