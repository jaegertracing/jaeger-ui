// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { handleActions } from 'redux-actions';

import { fetchServices, fetchServiceOperations as fetchOps } from '../actions/jaeger-api';

const initialState = {
  services: [],
  operationsForService: {},
  loading: false,
  error: null,
};

function fetchStarted(state) {
  return Object.assign({}, state, { loading: true });
}

function fetchServicesDone(state, { payload }) {
  const services = payload.data;
  return Object.assign({}, state, {
    services,
    error: null,
    loading: false,
  });
}

function fetchServicesErred(state, { payload: error }) {
  return Object.assign({}, state, {
    error: error.message,
    loading: false,
    services: [],
  });
}

function fetchOpsStarted(state, { meta: { serviceName } }) {
  const operationsForService = Object.assign({}, state.operationsForService, { [serviceName]: [] });
  return Object.assign({}, state, { operationsForService });
}

function fetchOpsDone(state, { meta, payload }) {
  const { data: operations } = payload;
  const operationsForService = Object.assign({}, state.operationsForService, {
    [meta.serviceName]: operations,
  });
  return Object.assign({}, state, { operationsForService });
}

// TODO(joe): fetchOpsErred

export default handleActions(
  {
    [`${fetchServices}_PENDING`]: fetchStarted,
    [`${fetchServices}_FULFILLED`]: fetchServicesDone,
    [`${fetchServices}_REJECTED`]: fetchServicesErred,

    [`${fetchOps}_PENDING`]: fetchOpsStarted,
    [`${fetchOps}_FULFILLED`]: fetchOpsDone,
  },
  initialState
);
