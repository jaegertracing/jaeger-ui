// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../utils/prefix-url';

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
  if (errData.msg != null) {
    if (errData.code == null) {
      // Some responses carry `msg` with no `code` at all, which is how a missing
      // trace is reported. Show that message rather than dumping the raw object.
      return errData.msg;
    }
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

// Jaeger answers 200 with an `errors` array and no payload when the query was
// fine but produced nothing, such as a trace ID that does not exist. A response
// carrying both data and errors is a partial success and flows through untouched.
function isErrorOnlyPayload(body: unknown): body is { errors: unknown[] } {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const { errors, data } = body as { errors?: unknown; data?: unknown };
  if (!Array.isArray(errors) || errors.length === 0) {
    return false;
  }
  return data == null || (Array.isArray(data) && data.length === 0);
}

function getJSON(url: string, options: FetchOptions = {}): Promise<any> {
  const { query = null, ...init } = options;
  (init as any).credentials = 'same-origin';
  let queryStr = '';

  if (query) {
    queryStr = `?${typeof query === 'string' ? query : queryString.stringify(query)}`;
  }

  return fetch(`${url}${queryStr}`, init as RequestInit).then((response: Response) => {
    const makeError = (rawMessage: string, body: string): IApiError => {
      const errorMessage = typeof rawMessage === 'string' ? rawMessage.trim() : rawMessage;
      const error: IApiError = new Error(`HTTP Error: ${errorMessage}`);
      error.httpStatus = response.status;
      error.httpStatusText = response.statusText;
      error.httpBody = body;
      error.httpUrl = url;
      error.httpQuery = typeof query === 'string' ? query : queryString.stringify(query || {});
      return error;
    };

    if (response.status < 400) {
      return response.json().then((body: unknown) => {
        if (isErrorOnlyPayload(body)) {
          const errorMessage = body.errors.map(err => getMessageFromError(err, response.status)).join('; ');
          throw makeError(errorMessage, JSON.stringify(body, null, 2));
        }
        return body;
      });
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
      throw makeError(errorMessage, bodyTextFmt ?? bodyText);
    });
  });
}

export const DEFAULT_API_ROOT = prefixUrl('/api/');

const JaegerAPI = {
  apiRoot: DEFAULT_API_ROOT,
  fetchServiceOperations(serviceName: string): Promise<any> {
    return getJSON(`${this.apiRoot}services/${encodeURIComponent(serviceName)}/operations`);
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
  // TODO: Delete with jaeger.ts; DownloadResults now uses jaegerClient.fetchTrace (#4649).
  fetchTrace(id: string): Promise<any> {
    return getJSON(`${this.apiRoot}traces/${encodeURIComponent(id)}`);
  },
};

export default JaegerAPI;
