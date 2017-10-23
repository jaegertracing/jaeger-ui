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

import ReactGA from 'react-ga';

export function init() {
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_GA_TRACKING_ID) {
    const GA_CODE = process.env.REACT_APP_GA_TRACKING_ID;
    ReactGA.initialize(GA_CODE);
  }
}

export function trackPageView(pathname, search) {
  const pagePath = search ? `${pathname}?${search}` : pathname;
  ReactGA.pageview(pagePath);
}
