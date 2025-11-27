// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import fetch from 'isomorphic-fetch';
import dayjs from 'dayjs';
import _duration from 'dayjs/plugin/duration';
import queryString from 'query-string';

import getConfig from '../utils/config/get-config';
import prefixUrl from '../utils/prefix-url';

dayjs.extend(_duration);

// export for tests
export function getMessageFromError(errData, status) {
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

function getJSON(url, options = {}) {
  const { query = null, ...init } = options;
  init.credentials = 'same-origin';
  let queryStr = '';

  if (query) {
    queryStr = `?${typeof query === 'string' ? query : queryString.stringify(query)}`;
  }

  return fetch(`${url}${queryStr}`, init).then(response => {
    if (response.status < 400) {
      return response.json();
    }
    return response.text().then(bodyText => {
      let data;
      let bodyTextFmt;
      let errorMessage;
      try {
        data = JSON.parse(bodyText);
        bodyTextFmt = JSON.stringify(data, null, 2);
      } catch {
        data = null;
        bodyTextFmt = null;
      }
      if (data && Array.isArray(data.errors) && data.errors.length) {
        errorMessage = data.errors.map(err => getMessageFromError(err, response.status)).join('; ');
      } else {
        errorMessage = bodyText || `${response.status} - ${response.statusText}`;
      }
      if (typeof errorMessage === 'string') {
        errorMessage = errorMessage.trim();
      }
      const error = new Error(`HTTP Error: ${errorMessage}`);
      error.httpStatus = response.status;
      error.httpStatusText = response.statusText;
      error.httpBody = bodyTextFmt || bodyText;
      error.httpUrl = url;
      error.httpQuery = typeof query === 'string' ? query : queryString.stringify(query);
      throw error;
    });
  });
}

export const DEFAULT_API_ROOT = prefixUrl('/api/');
export const ANALYTICS_ROOT = prefixUrl('/analytics/');
export const QUALITY_METRICS_ROOT = prefixUrl(getConfig().qualityMetrics.apiEndpoint);
export const DEFAULT_DEPENDENCY_LOOKBACK = dayjs.duration(1, 'weeks').asMilliseconds();

const JaegerAPI = {
  apiRoot: DEFAULT_API_ROOT,
  archiveTrace(id) {
    return getJSON(`${this.apiRoot}archive/${id}`, { method: 'POST' });
  },
  fetchDecoration(url) {
    return getJSON(url);
  },
  fetchDeepDependencyGraph(query) {
    return getJSON(`${ANALYTICS_ROOT}v1/dependencies`, { query });
  },
  fetchDependencies(endTs = new Date().getTime(), lookback = DEFAULT_DEPENDENCY_LOOKBACK) {
    return getJSON(`${this.apiRoot}dependencies`, { query: { endTs, lookback } });
  },
  fetchQualityMetrics(service, hours) {
    return getJSON(QUALITY_METRICS_ROOT, { query: { hours, service } });
  },
  fetchServiceOperations(serviceName) {
    return getJSON(`${this.apiRoot}services/${encodeURIComponent(serviceName)}/operations`);
  },
  transformOTLP(traces) {
    return getJSON(`${this.apiRoot}transform`, { method: 'POST', body: JSON.stringify(traces) });
  },
  fetchServiceServerOps(service) {
    return getJSON(`${this.apiRoot}operations`, {
      query: {
        service,
        spanKind: 'server',
      },
    });
  },
  fetchServices() {
    return getJSON(`${this.apiRoot}services`);
  },
  fetchTrace(id) {
    return getJSON(`${this.apiRoot}traces/${id}`);
  },
  fetchTagValues(tagName, service) {
    const query = { key: tagName };
    if (service) query.service = service;
    return getJSON(`${this.apiRoot}metrics/attributes`, { query }).then(response => response.data || []);
  },
  searchTraces(query) {
    return getJSON(`${this.apiRoot}traces`, { query });
  },
  fetchMetrics(metricType, serviceNameList, query) {
    const servicesName = serviceNameList.map(serviceName => `service=${serviceName}`).join(',');

    return getJSON(`${this.apiRoot}metrics/${metricType}`, {
      query: `${servicesName}&${queryString.stringify(query)}`,
    }).then(d => ({ ...d, quantile: query.quantile }));
  },
};

export default JaegerAPI;
