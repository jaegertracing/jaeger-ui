// Copyright (c) 2017, 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { handleActions } from 'redux-actions';

import {
  fetchServices,
  fetchServiceOperations as fetchOps,
  fetchServiceServerOps as fetchServerOps,
} from '../actions/jaeger-api';
import { localeStringComparator } from '../utils/sort';

/**
 * State for managing services and their operations.
 *
 * Loading strategy:
 * - `services`: Loaded once when the page loads (null indicates not yet loaded)
 * - `operationsForService`: Cached incrementally as users select services
 * - `serverOpsForService`: Cached incrementally as users select services
 *
 * Operations are fetched on-demand when a service is selected and cached in the state.
 * Once loaded, they remain available until the page is refreshed or state is reset.
 */
type ServicesState = {
  error: any;
  loading: boolean;
  /** Cache of operations per service, keyed by service name */
  operationsForService: Record<string, string[]>;
  /** Cache of server operations per service, keyed by service name */
  serverOpsForService: Record<string, string[]>;
  /** List of all services (null = not yet loaded) */
  services: string[] | null;
};

const initialState: ServicesState = {
  error: null,
  loading: false,
  operationsForService: {},
  serverOpsForService: {},
  // `services` initial value of `null` indicates they haven't yet been loaded
  services: null,
};

function fetchStarted(state: ServicesState): ServicesState {
  return { ...state, loading: true };
}

function fetchServicesDone(state: ServicesState, { payload }: any): ServicesState {
  const services = payload.data || [];
  services.sort(localeStringComparator);
  return { ...state, services, error: null, loading: false };
}

function fetchServicesErred(state: ServicesState, { payload: error }: any): ServicesState {
  return { ...state, error, loading: false, services: [] };
}

function fetchServerOpsStarted(state: ServicesState, { meta: { serviceName } }: any): ServicesState {
  const serverOpsForService = {
    ...state.operationsForService,
    [serviceName]: [],
  };
  return { ...state, serverOpsForService };
}

function fetchServerOpsDone(
  state: ServicesState,
  { meta: { serviceName }, payload: { data: serverOpStructs } }: any
): ServicesState {
  if (!Array.isArray(serverOpStructs)) return state;

  const serverOpsForService = {
    ...state.operationsForService,
    [serviceName]: serverOpStructs.map(({ name }: any) => name).sort(localeStringComparator),
  };
  return { ...state, serverOpsForService };
}

function fetchOpsStarted(state: ServicesState, { meta: { serviceName } }: any): ServicesState {
  const operationsForService = {
    ...state.operationsForService,
    [serviceName]: [],
  };
  return { ...state, operationsForService };
}

function fetchOpsDone(state: ServicesState, { meta, payload }: any): ServicesState {
  const { data: operations } = payload;
  if (Array.isArray(operations)) {
    operations.sort(localeStringComparator);
  }
  const operationsForService = {
    ...state.operationsForService,
    [meta.serviceName]: operations || [],
  };
  return { ...state, operationsForService };
}

// TODO(joe): fetchOpsErred

export default handleActions(
  {
    [`${fetchServices}_PENDING`]: fetchStarted,
    [`${fetchServices}_FULFILLED`]: fetchServicesDone,
    [`${fetchServices}_REJECTED`]: fetchServicesErred,

    [`${fetchServerOps}_PENDING`]: fetchServerOpsStarted,
    [`${fetchServerOps}_FULFILLED`]: fetchServerOpsDone,

    [`${fetchOps}_PENDING`]: fetchOpsStarted,
    [`${fetchOps}_FULFILLED`]: fetchOpsDone,
  },
  initialState
);
