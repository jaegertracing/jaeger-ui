// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export const TOP_NAV_HEIGHT = 46;

// Max number of services that "Hierarchical Layout" with "dot" layout engine can can render
// Can be configured with "dependencies.dagMaxNumServices"
export const FALLBACK_DAG_MAX_NUM_SERVICES = 500;

// Max number of services that layouts can render without selecting a focal service
export const DAG_MAX_NUM_SERVICES = 1200;
export const FALLBACK_TRACE_NAME = '<trace-without-root-span>';

export const FETCH_DONE = 'FETCH_DONE';
export const FETCH_ERROR = 'FETCH_ERROR';
export const FETCH_LOADING = 'FETCH_LOADING';

export const fetchedState = {
  DONE: FETCH_DONE,
  ERROR: FETCH_ERROR,
  LOADING: FETCH_LOADING,
};
