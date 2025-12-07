// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IWebAnalyticsFunc } from '../../types/tracking';

const NoopWebAnalytics: IWebAnalyticsFunc = () => ({
  init: () => {},
  trackPageView: () => {},
  trackError: () => {},
  trackEvent: () => {},
  context: null,
  isEnabled: () => false,
});

export default NoopWebAnalytics;
