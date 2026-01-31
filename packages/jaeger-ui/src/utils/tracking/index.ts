// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TNil } from '../../types';
import { IWebAnalyticsFunc } from '../../types/tracking';
import GA from './ga';
import NoopWebAnalytics from './noopWebAnalytics';
import getConfig from '../config/get-config';
import { getVersionInfo } from '../constants';

const TrackingImplementation = () => {
  const config = getConfig();
  let versionShort;
  let versionLong;

  const versionInfo = getVersionInfo();

  if (versionInfo) {
    try {
      const data = JSON.parse(versionInfo);
      const joiner = [data.objName];
      if (data.changed.hasChanged) {
        joiner.push(data.changed.pretty);
      }
      versionShort = joiner.join(' ');
      versionLong = data.pretty;
    } catch (_) {
      versionShort = versionInfo;
      versionLong = versionInfo;
    }
    versionLong = versionLong.length > 99 ? `${versionLong.slice(0, 96)}...` : versionLong;
  } else {
    versionShort = 'unknown';
    versionLong = 'unknown';
  }

  let webAnalyticsFunc = NoopWebAnalytics;

  if (config.tracking && config.tracking.customWebAnalytics) {
    webAnalyticsFunc = config.tracking.customWebAnalytics as IWebAnalyticsFunc;
  } else if (config.tracking && config.tracking.gaID) {
    webAnalyticsFunc = GA;
  }

  const webAnalytics = webAnalyticsFunc(config, versionShort, versionLong);
  webAnalytics.init();

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
