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

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link } from 'react-router-dom';

import AltViewOptions from './AltViewOptions';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import SpanGraph from './SpanGraph';
import { TracePageHeaderFn as TracePageHeader, HEADER_ITEMS } from './TracePageHeader';
import LabeledList from '../../common/LabeledList';
import traceGenerator from '../../../demo/trace-generators';
import { getTraceName } from '../../../model/trace-viewer';
import transformTraceData from '../../../model/transform-trace-data';

describe('<TracePageHeader>', () => {
  const trace = transformTraceData(traceGenerator.trace({}));
  const defaultProps = {
    trace,
    showArchiveButton: false,
    showShortcutsHelp: false,
    showStandaloneLink: false,
    showViewOptions: false,
    textFilter: '',
    updateTextFilter: () => {},
  };

  let rendered;
  beforeEach(() => {
    rendered = render(<TracePageHeader {...defaultProps} / data-testid="tracepageheader">));
  });

  it('renders a <header />', () => {
    expect(screen.getAllByTestId('header')).toHaveLength(1);
  });

  it('renders an empty <div> if a trace is not present', () => {
    wrapper = mount(<TracePageHeader {...defaultProps} trace={null} / data-testid="tracepageheader">);
    expect(wrapper.children().length).toBe(0);
  });

  it('renders the trace title', () => {
    expect(wrapper.find({ traceName: getTraceName(trace.spans) })).toBeTruthy();
  });

  it('renders the header items', () => {
    wrapper.find('.horizontal .item').forEach((item, i) => {
      expect(item.contains(HEADER_ITEMS[i].title)).toBeTruthy();
      expect(item.contains(HEADER_ITEMS[i].renderer(defaultProps.trace))).toBeTruthy();
    });
  });

  it('renders a <SpanGraph>', () => {
    expect(screen.getAllByTestId(SpanGraph)).toHaveLength(1);
  });

  describe('observes the visibility toggles for various UX elements', () => {
    it('hides the minimap when hideMap === true', () => {
      expect(screen.getAllByTestId(SpanGraph)).toHaveLength(1);
      rendered = render({ hideMap: true });
      expect(screen.getAllByTestId(SpanGraph)).toHaveLength(0);
    });

    it('hides the summary when hideSummary === true', () => {
      expect(screen.getAllByTestId(LabeledList)).toHaveLength(1);
      rendered = render({ hideSummary: true });
      expect(screen.getAllByTestId(LabeledList)).toHaveLength(0);
    });

    it('toggles the archive button', () => {
      const onArchiveClicked = () => {};
      const props = {
        onArchiveClicked,
        showArchiveButton: true,
      };
      wrapper.setProps(props);
      expect(screen.getAllByTestId({ onClick: onArchiveClicked })).toHaveLength(1);
      props.showArchiveButton = false;
      wrapper.setProps(props);
      expect(screen.getAllByTestId({ onClick: onArchiveClicked })).toHaveLength(0);
    });

    it('toggles <KeyboardShortcutsHelp / data-testid="keyboardshortcutshelp">', () => {
      const props = { showShortcutsHelp: true };
      wrapper.setProps(props);
      expect(screen.getAllByTestId(KeyboardShortcutsHelp)).toHaveLength(1);
      props.showShortcutsHelp = false;
      wrapper.setProps(props);
      expect(screen.getAllByTestId(KeyboardShortcutsHelp)).toHaveLength(0);
    });

    it('toggles <AltViewOptions / data-testid="altviewoptions">', () => {
      const props = { showViewOptions: true };
      wrapper.setProps(props);
      expect(screen.getAllByTestId(AltViewOptions)).toHaveLength(1);
      props.showViewOptions = false;
      wrapper.setProps(props);
      expect(screen.getAllByTestId(AltViewOptions)).toHaveLength(0);
    });

    it('renders the link to search', () => {
      expect(screen.getAllByTestId(Link)).toHaveLength(0);

      const toSearch = 'some-link';
      rendered = render({ toSearch });
      expect(screen.getAllByTestId({ to: toSearch })).toHaveLength(1);
    });

    it('toggles the standalone link', () => {
      const linkToStandalone = 'some-link';
      const props = {
        linkToStandalone,
        showStandaloneLink: true,
      };
      wrapper.setProps(props);
      expect(screen.getAllByTestId({ to: linkToStandalone })).toHaveLength(1);
      props.showStandaloneLink = false;
      wrapper.setProps(props);
      expect(screen.getAllByTestId({ to: linkToStandalone })).toHaveLength(0);
    });
  });
});
