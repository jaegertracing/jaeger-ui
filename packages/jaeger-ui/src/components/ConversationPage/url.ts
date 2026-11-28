// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../../utils/prefix-url';
import { asValidConfigLookback } from '../../utils/time-range-options';

export const ROUTE_PATH = prefixUrl('/conversation/:id');

// A conversation usually spans minutes to days, so the default window is wider than the
// search page's.
export const DEFAULT_CONVERSATION_LOOKBACK = '7d';

export type ConversationUrlState = {
  service?: string;
  lookback: string;
};

function firstOf(value: string | (string | null)[] | null | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v || undefined;
}

export function getUrl(conversationID: string, state: Partial<ConversationUrlState> = {}): string {
  const path = prefixUrl(`/conversation/${encodeURIComponent(conversationID)}`);
  const search = queryString.stringify({ service: state.service, lookback: state.lookback });
  return search ? `${path}?${search}` : path;
}

export function getUrlState(search: string): ConversationUrlState {
  const params = queryString.parse(search);
  return {
    service: firstOf(params.service),
    lookback: asValidConfigLookback(firstOf(params.lookback)) ?? DEFAULT_CONVERSATION_LOOKBACK,
  };
}
