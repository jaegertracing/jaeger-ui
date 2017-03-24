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

import ReactGA from 'react-ga';

if (
  process.env.NODE_ENV === 'production' && process.env.REACT_APP_GA_TRACKING_ID
) {
  const GA_CODE = process.env.REACT_APP_GA_TRACKING_ID;
  ReactGA.initialize(GA_CODE);
}

const GoogleAnalytics = {
  pageView(event, fields) {
    ReactGA.set({
      page: fields.page,
    });
    ReactGA.pageview(fields.pathname);
  },
  track(eventName, params) {
    ReactGA.event({
      category: params.page,
      action: eventName,
      label: params.label,
      value: params.value,
    });
  },
};

export default {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  vendors: [
    {
      name: 'Google Analytics',
      api: GoogleAnalytics,
    },
  ],
  pageDefaults(routeState) {
    const paths = routeState.pathname.substr(1).split('/');
    return {
      pathname: routeState.pathname,
      query: routeState.query,
      page: !paths[0] ? 'landing' : paths[0],
    };
  },
};
