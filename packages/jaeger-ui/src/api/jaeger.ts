// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import dayjs from 'dayjs';
import _duration from 'dayjs/plugin/duration';
import queryString from 'query-string';

import getConfig from '../utils/config/get-config';
import prefixUrl from '../utils/prefix-url';
import { getJSON } from './http';
import { apiConfig } from './config';

export { DEFAULT_API_ROOT } from './config';
export { getMessageFromError } from './http';

dayjs.extend(_duration);

const QUALITY_METRICS_ROOT = prefixUrl(getConfig().qualityMetrics?.apiEndpoint || '');
export const DEFAULT_DEPENDENCY_LOOKBACK = dayjs.duration(1, 'weeks').asMilliseconds();

const JaegerAPI = {
  get apiRoot(): string {
    return apiConfig.apiRoot;
  },
  set apiRoot(root: string) {
    apiConfig.apiRoot = root;
  },
  fetchDeepDependencyGraph(query: Record<string, any>): Promise<any> {
    return getJSON(`${this.apiRoot}deep-dependencies`, { query });
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
    return getJSON(`${this.apiRoot}traces/${encodeURIComponent(id)}`);
  },
  fetchMetrics(metricType: string, serviceNameList: string[], query: Record<string, any>): Promise<any> {
    const servicesName = serviceNameList.map((serviceName: string) => `service=${serviceName}`).join(',');

    return getJSON(`${this.apiRoot}metrics/${metricType}`, {
      query: `${servicesName}&${queryString.stringify(query)}`,
    }).then((d: any) => ({ ...d, quantile: query.quantile }));
  },
};

export default JaegerAPI;
