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

export type TMonitorUrlParams = {
  service: string;
  spanKind: spanKinds;
  timeframe: number;
};

export function getUrl(params?: TMonitorUrlParams, currentSearch = ''): string {
  if (!params) return ROUTE_PATH;

  const merged = {
    ...queryString.parse(currentSearch),
    service: params.service,
    spanKind: params.spanKind,
    timeframe: params.timeframe,
  };

  return `${ROUTE_PATH}?${queryString.stringify(merged)}`;
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
