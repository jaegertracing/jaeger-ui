// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';
import { spanKinds } from '../../types/metrics';
import { timeFrameOptions } from './ServicesView/timeFrameUtils';

export const ROUTE_PATH = prefixUrl('/monitor');

const VALID_SPAN_KINDS: spanKinds[] = ['client', 'server', 'internal', 'producer', 'consumer'];

export function matches(path: string) {
  return Boolean(matchPath(ROUTE_PATH, path));
}

export function getUrl() {
  return ROUTE_PATH;
}

export type TMonitorUrlState = {
  service?: string;
  spanKind?: spanKinds;
  timeframe?: number;
};

const firstValue = (value: string | (string | null)[] | null): string | null =>
  Array.isArray(value) ? value[0] : value;

export const getUrlState = memoizeOne(function getUrlState(search: string): TMonitorUrlState {
  const { service, spanKind, timeframe } = queryString.parse(search);
  const rv: TMonitorUrlState = {};

  const serviceValue = firstValue(service);
  if (serviceValue) rv.service = serviceValue;

  const spanKindValue = firstValue(spanKind);
  if (spanKindValue && VALID_SPAN_KINDS.includes(spanKindValue as spanKinds)) {
    rv.spanKind = spanKindValue as spanKinds;
  }

  const timeframeValue = firstValue(timeframe);
  if (timeframeValue != null && /^\d+$/.test(timeframeValue)) {
    const parsed = Number(timeframeValue);
    if (Number.isFinite(parsed) && timeFrameOptions.some(option => option.value === parsed)) {
      rv.timeframe = parsed;
    }
  }

  return rv;
});
