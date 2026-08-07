// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export const DEFAULT_OPERATION = 'all';

// ALL_SERVICES is the reserved Service value meaning "search every service". It is
// offered only when the backend advertises backendCapabilities.searchWithoutServiceName,
// travels through the search URL like any other service value so a shared link restores
// the selection, and is dropped when the API query is built (the v3 search API reads an
// absent service name as "any service"). A service actually named this would be
// shadowed, the same trade-off the '-' placeholder already carries.
export const ALL_SERVICES = '__all_services__';
export const DEFAULT_LOOKBACK = '1h';
export const DEFAULT_LIMIT = 20;
