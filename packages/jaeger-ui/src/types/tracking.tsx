// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { BrowserClient } from '@sentry/browser';
import { TNil } from '.';
import { Config } from './config';

export interface IWebAnalyticsFunc {
  (config: Config, versionShort: string, versionLong: string): IWebAnalytics;
}

export default interface IWebAnalytics {
  init: () => void;
  context: boolean | typeof BrowserClient | null;
  isEnabled: () => boolean;
  trackPageView: (pathname: string, search: string | TNil) => void;
  trackError: (description: string) => void;
  trackEvent: (
    category: string,
    action: string,
    labelOrValue?: string | number | TNil,
    value?: number | TNil
  ) => void;
}
