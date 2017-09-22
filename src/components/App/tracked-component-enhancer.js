// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as React from 'react';
import type { Location } from 'react-router-dom';

import { trackPageView } from '../../utils/metrics';

type TrackedComponentProps = {
  location: Location,
};

/**
 * Wrap `Component` to add tracking based on changes in
 * `props.location.pathname` and `props.location.search`. If either change, a
 * page-view is tracked.
 */
export default function trackedComponentEnhancer(Component: any) {
  class TrackedComponent extends React.Component<TrackedComponentProps> {
    props: TrackedComponentProps;

    componentDidMount() {
      const { pathname, search } = this.props.location;
      trackPageView(pathname, search);
    }

    componentWillReceiveProps(nextProps: TrackedComponentProps) {
      const { pathname, search } = this.props.location;
      const { pathname: nextPathname, search: nextSearch } = nextProps.location;
      if (pathname !== nextPathname || search !== nextSearch) {
        trackPageView(nextPathname, nextSearch);
      }
    }

    render() {
      return <Component {...this.props} />;
    }
  }

  return TrackedComponent;
}
