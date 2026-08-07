// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export const DEFAULT_OPERATION = 'all';
// Reserved Service value meaning "search every service"; dropped when the API query is
// built, since the search API reads an absent service name as "any service".
export const ALL_SERVICES = 'all';
export const DEFAULT_LOOKBACK = '1h';
export const DEFAULT_LIMIT = 20;
