// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getToggleValue } from '../../../utils/tracking/common';
import { trackEvent } from '../../../utils/tracking';
import { ETraceViewType } from '../types';

// export for tests
export const CATEGORY_ALT_VIEW = 'jaeger/ux/trace/alt-view';
export const CATEGORY_SLIM_HEADER = 'jaeger/ux/trace/slim-header';

export const trackViewChange = (viewType: ETraceViewType) => trackEvent(CATEGORY_ALT_VIEW, viewType);

// use a closure instead of bind to prevent forwarding any arguments to trackEvent()
export const trackJsonView = () => trackEvent(CATEGORY_ALT_VIEW, 'json');
export const trackRawJsonView = () => trackEvent(CATEGORY_ALT_VIEW, 'rawJson');

export const trackSlimHeaderToggle = (isOpen: boolean) =>
  trackEvent(CATEGORY_SLIM_HEADER, getToggleValue(isOpen));
