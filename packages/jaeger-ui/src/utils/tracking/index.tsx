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

import { TNil, IWebAnalytics } from '../../types';
import GA from './ga';
import getConfig from '../config/get-config';

const TrackingImplementation = () => {
  const config = getConfig();

  const GenericWebAnalytics: IWebAnalytics = {
    init: () => {},
    trackPageView: () => {},
    trackError: () => {},
    trackEvent: () => {},
    context: null,
    isEnabled: () => false,
  };

  let webAnalytics = GenericWebAnalytics;

  if (config.tracking && config.tracking.customWebAnalytics) {
    webAnalytics = config.tracking.customWebAnalytics(config) as IWebAnalytics;
  } else if (config.tracking && config.tracking.gaID) {
    webAnalytics = new GA(config);
  }

  if (webAnalytics.isEnabled()) {
    webAnalytics.init();

    return webAnalytics;
  }

  return webAnalytics;
};

const tracker = TrackingImplementation();

export function trackPageView(pathname: string, search: string | TNil) {
  return tracker.trackPageView(pathname, search);
}

export function trackError(description: string) {
  return tracker.trackError(description);
}

export function trackEvent(
  category: string,
  action: string,
  labelOrValue?: string | number | TNil,
  value?: number | TNil
) {
  return tracker.trackEvent(category, action, labelOrValue, value);
}

export const context = tracker.context;
export const isWaEnabled = tracker.isEnabled();
