// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _throttle from 'lodash/throttle';

import { trackEvent } from '.';

import { TNil } from '../../types';

// export for tests
export const ACTION_FILTER_SET = 'set';
export const ACTION_FILTER_CLEAR = 'clear';

const getTrackFilterSet = (category: string) =>
  _throttle(trackEvent.bind(null, category, ACTION_FILTER_SET), 750, {
    leading: false,
  });

const getTrackFilterClear = (category: string) =>
  _throttle(trackEvent.bind(null, category, ACTION_FILTER_CLEAR), 750, {
    leading: false,
  });

export default function getTrackFilter(category: string) {
  const trackFilterSet = getTrackFilterSet(category);
  const trackFilterClear = getTrackFilterClear(category);
  return (value: string | TNil) => (value ? trackFilterSet() : trackFilterClear());
}
