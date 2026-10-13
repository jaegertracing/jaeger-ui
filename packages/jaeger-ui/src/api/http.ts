// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

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

export function getJSON(url: string, options: FetchOptions = {}): Promise<any> {
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
