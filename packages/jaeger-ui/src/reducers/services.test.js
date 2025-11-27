// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fetchServices, fetchServiceOperations, fetchServiceServerOps } from '../actions/jaeger-api';
import serviceReducer from './services';

const initialState = serviceReducer(undefined, {});

describe('reducers/services', () => {
  function verifyInitialState() {
    expect(initialState).toEqual({
      error: null,
      loading: false,
      operationsForService: {},
      serverOpsForService: {},
      services: null,
    });
  }

  beforeEach(verifyInitialState);
  afterEach(verifyInitialState);

  const ops = ['a', 'b'];
  const serviceName = 'test service';

  it('#92 - ensures services is at least an empty array', () => {
    const services = null;
    const state = serviceReducer(initialState, {
      type: `${fetchServices}_FULFILLED`,
      payload: { data: services },
    });
    const expected = {
      ...initialState,
      services: [],
    };
    expect(state).toEqual(expected);
  });

  it('should handle a fetch services with loading state', () => {
    const state = serviceReducer(initialState, {
      type: `${fetchServices}_PENDING`,
    });
    const expected = {
      ...initialState,
      loading: true,
    };
    expect(state).toEqual(expected);
  });

  it('should handle successful services fetch', () => {
    const services = ['a', 'b', 'c'];
    const state = serviceReducer(initialState, {
      type: `${fetchServices}_FULFILLED`,
      payload: { data: services.slice() },
    });
    const expected = {
      ...initialState,
      services,
    };
    expect(state).toEqual(expected);
  });

  it('should handle a failed services fetch', () => {
    const error = new Error('some-message');
    const state = serviceReducer(initialState, {
      type: `${fetchServices}_REJECTED`,
      payload: error,
    });
    const expected = {
      ...initialState,
      error,
      services: [],
    };
    expect(state).toEqual(expected);
  });

  it('should handle a successful operations for a service fetch', () => {
    const state = serviceReducer(initialState, {
      type: `${fetchServiceOperations}_FULFILLED`,
      meta: { serviceName },
      payload: { data: ops.slice() },
    });
    const expected = {
      ...initialState,
      operationsForService: {
        [serviceName]: ops,
      },
    };
    expect(state).toEqual(expected);
  });

  it('should handle if successful operations for a service fetch returns non-array', () => {
    const state = serviceReducer(initialState, {
      type: `${fetchServiceOperations}_FULFILLED`,
      meta: { serviceName },
      payload: { data: null },
    });
    const expected = {
      ...initialState,
      operationsForService: {
        [serviceName]: [],
      },
    };
    expect(state).toEqual(expected);
  });

  it('should handle a pending operations for a service fetch', () => {
    const state = serviceReducer(
      {
        ...initialState,
        operationsForService: {
          [serviceName]: ops,
        },
      },
      {
        type: `${fetchServiceOperations}_PENDING`,
        meta: { serviceName },
      }
    );
    const expected = {
      ...initialState,
      operationsForService: {
        [serviceName]: [],
      },
    };
    expect(state).toEqual(expected);
  });

  it('should handle a successful server operations for a service fetch', () => {
    const state = serviceReducer(initialState, {
      type: `${fetchServiceServerOps}_FULFILLED`,
      meta: { serviceName },
      payload: { data: ops.map(name => ({ name })) },
    });
    const expected = {
      ...initialState,
      serverOpsForService: {
        [serviceName]: ops,
      },
    };
    expect(state).toEqual(expected);
  });

  it('should no-op if successful server operations for a service fetch returns non-array', () => {
    const state = serviceReducer(initialState, {
      type: `${fetchServiceServerOps}_FULFILLED`,
      meta: { serviceName },
      payload: { data: 'invalid data' },
    });
    expect(state).toBe(initialState);
  });

  it('should handle a pending server operations for a service fetch', () => {
    const state = serviceReducer(
      {
        ...initialState,
        serverOpsForService: {
          [serviceName]: ops,
        },
      },
      {
        type: `${fetchServiceServerOps}_PENDING`,
        meta: { serviceName },
      }
    );
    const expected = {
      ...initialState,
      serverOpsForService: {
        [serviceName]: [],
      },
    };
    expect(state).toEqual(expected);
  });
});
