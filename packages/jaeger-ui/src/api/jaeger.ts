// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import fetch from 'isomorphic-fetch';
import dayjs from 'dayjs';
import _duration from 'dayjs/plugin/duration';
import queryString from 'query-string';

import getConfig from '../utils/config/get-config';
import prefixUrl from '../utils/prefix-url';

dayjs.extend(_duration);

interface IApiError extends Error {
  httpStatus?: number;
  httpStatusText?: string;
  httpBody?: string;
  httpUrl?: string;
  httpQuery?: string;
}

type FetchOptions = {
  query?: string | Record<string, any> | null;
  method?: string;
  body?: string;
  credentials?: RequestCredentials;
};

// export for tests
export function getMessageFromError(errData: any, status: number): string {
  if (errData.code != null && errData.msg != null) {
    if (errData.code === status) {
      return errData.msg;
    }
    return `${errData.code} - ${errData.msg}`;
  }
  try {
    return JSON.stringify(errData);
  } catch {
    return String(errData);
  }
}

function getJSON(url: string, options: FetchOptions = {}): Promise<any> {
  const { query = null, ...init } = options;
  (init as any).credentials = 'same-origin';
  let queryStr = '';

  if (query) {
    queryStr = `?${typeof query === 'string' ? query : queryString.stringify(query)}`;
  }

  return fetch(`${url}${queryStr}`, init as RequestInit).then((response: Response) => {
    if (response.status < 400) {
      return response.json();
    }
    return response.text().then((bodyText: string) => {
      let data: any;
      let bodyTextFmt: string | null;
      let errorMessage: string;
      try {
        data = JSON.parse(bodyText);
        bodyTextFmt = JSON.stringify(data, null, 2);
      } catch {
        data = null;
        bodyTextFmt = null;
      }
      if (data && Array.isArray(data.errors) && data.errors.length) {
        errorMessage = data.errors.map((err: any) => getMessageFromError(err, response.status)).join('; ');
      } else {
        errorMessage = bodyText || `${response.status} - ${response.statusText}`;
      }
      if (typeof errorMessage === 'string') {
        errorMessage = errorMessage.trim();
      }
      const error: IApiError = new Error(`HTTP Error: ${errorMessage}`);
      error.httpStatus = response.status;
      error.httpStatusText = response.statusText;
      error.httpBody = bodyTextFmt || bodyText;
      error.httpUrl = url;
      error.httpQuery = typeof query === 'string' ? query : queryString.stringify(query || {});
      throw error;
    });
  });
}

export const DEFAULT_API_ROOT = prefixUrl('/api/');
export const ANALYTICS_ROOT = prefixUrl('/analytics/');
export const QUALITY_METRICS_ROOT = prefixUrl(getConfig().qualityMetrics?.apiEndpoint || '');
export const DEFAULT_DEPENDENCY_LOOKBACK = dayjs.duration(1, 'weeks').asMilliseconds();

const JaegerAPI = {
  apiRoot: DEFAULT_API_ROOT,
  archiveTrace(id: string): Promise<any> {
    return getJSON(`${this.apiRoot}archive/${id}`, { method: 'POST' });
  },
  fetchDecoration(url: string): Promise<any> {
    return getJSON(url);
  },
  fetchDeepDependencyGraph(query: Record<string, any>): Promise<any> {
    return getJSON(`${ANALYTICS_ROOT}v1/dependencies`, { query });
  },
  fetchDependencies(endTs = new Date().getTime(), lookback = DEFAULT_DEPENDENCY_LOOKBACK): Promise<any> {
    return getJSON(`${this.apiRoot}dependencies`, { query: { endTs, lookback } });
  },
  fetchQualityMetrics(service: string, hours: number): Promise<any> {
    return getJSON(QUALITY_METRICS_ROOT, { query: { hours, service } });
  },
  fetchServiceOperations(serviceName: string): Promise<any> {
    return getJSON(`${this.apiRoot}services/${encodeURIComponent(serviceName)}/operations`);
  },
  transformOTLP(traces: any): Promise<any> {
    return getJSON(`${this.apiRoot}transform`, { method: 'POST', body: JSON.stringify(traces) });
  },
  fetchServiceServerOps(service: string): Promise<any> {
    return getJSON(`${this.apiRoot}operations`, {
      query: {
        service,
        spanKind: 'server',
      },
    });
  },
  fetchServices(): Promise<any> {
    return getJSON(`${this.apiRoot}services`);
  },
  fetchTrace(id: string): Promise<any> {
    return getJSON(`${this.apiRoot}traces/${id}`);
  },
  searchTraces(query: Record<string, any>): Promise<any> {
    return getJSON(`${this.apiRoot}traces`, { query });
  },
  fetchMetrics(metricType: string, serviceNameList: string[], query: Record<string, any>): Promise<any> {
    const servicesName = serviceNameList.map((serviceName: string) => `service=${serviceName}`).join(',');

    return getJSON(`${this.apiRoot}metrics/${metricType}`, {
      query: `${servicesName}&${queryString.stringify(query)}`,
    }).then((d: any) => ({ ...d, quantile: query.quantile }));
  },
};

export default JaegerAPI;
