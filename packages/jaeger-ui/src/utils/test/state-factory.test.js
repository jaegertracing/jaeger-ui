// Copyright (c) 2023 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { fetchedState } from '../../constants';
import {
  createState,
  createTrace,
  createTraceState,
  createServicesState,
  createDependenciesState,
  createDdgState,
  createMetricsState,
  createPathAgnosticDecorationsState,
  createTraceSearchState,
} from './state-factory';

describe('state-factory', () => {
  describe('createState', () => {
    it('creates a default state when no overrides are provided', () => {
      const state = createState();
      expect(state).toHaveProperty('config');
      expect(state).toHaveProperty('trace');
      expect(state).toHaveProperty('services');
      expect(state).toHaveProperty('dependencies');
      expect(state).toHaveProperty('ddg');
      expect(state).toHaveProperty('embedded');
      expect(state).toHaveProperty('metrics');
      expect(state).toHaveProperty('pathAgnosticDecorations');
    });

    it('applies overrides to the default state', () => {
      const configOverride = { archiveEnabled: true };
      const state = createState({ config: configOverride });
      expect(state.config.archiveEnabled).toBe(true);
    });
  });

  describe('createTrace', () => {
    it('creates a trace with the given ID', () => {
      const traceID = 'test-trace-id';
      const trace = createTrace(traceID);
      expect(trace.traceID).toBe(traceID);
    });

    it('applies overrides to the default trace', () => {
      const traceID = 'test-trace-id';
      const overrides = { duration: 2000000 };
      const trace = createTrace(traceID, overrides);
      expect(trace.traceID).toBe(traceID);
      expect(trace.duration).toBe(2000000);
    });
  });

  describe('createTraceState', () => {
    it('creates a loading trace state', () => {
      const id = 'test-trace-id';
      const state = createTraceState(id, fetchedState.LOADING);
      expect(state).toEqual({ id, state: fetchedState.LOADING });
    });

    it('creates an error trace state', () => {
      const id = 'test-trace-id';
      const error = new Error('Test error');
      const state = createTraceState(id, fetchedState.ERROR, undefined, error);
      expect(state).toEqual({ id, state: fetchedState.ERROR, error });
    });

    it('creates a done trace state with data', () => {
      const id = 'test-trace-id';
      const data = createTrace(id);
      const state = createTraceState(id, fetchedState.DONE, data);
      expect(state).toEqual({ id, state: fetchedState.DONE, data });
    });
  });

  describe('createServicesState', () => {
    it('creates a default services state', () => {
      const state = createServicesState();
      expect(state.services).toBe(null);
      expect(state.operationsForService).toEqual({});
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('creates a services state with the given services and operations', () => {
      const services = ['service1', 'service2'];
      const operations = { service1: ['op1', 'op2'], service2: ['op3'] };
      const state = createServicesState(services, operations);
      expect(state.services).toEqual(['service1', 'service2']);
      expect(state.operationsForService).toEqual(operations);
    });

    it('sorts services and operations', () => {
      const services = ['serviceB', 'serviceA'];
      const operations = { serviceA: ['opB', 'opA'], serviceB: ['opD', 'opC'] };
      const state = createServicesState(services, operations);
      expect(state.services).toEqual(['serviceA', 'serviceB']);
      expect(state.operationsForService.serviceA).toEqual(['opA', 'opB']);
      expect(state.operationsForService.serviceB).toEqual(['opC', 'opD']);
    });
  });

  describe('createDependenciesState', () => {
    it('creates a default dependencies state', () => {
      const state = createDependenciesState();
      expect(state.dependencies).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('creates a dependencies state with the given dependencies', () => {
      const dependencies = [
        { parent: 'service1', child: 'service2', callCount: 10 },
        { parent: 'service2', child: 'service3', callCount: 5 },
      ];
      const state = createDependenciesState(dependencies, true);
      expect(state.dependencies).toEqual(dependencies);
      expect(state.loading).toBe(true);
    });
  });

  describe('createDdgState', () => {
    it('creates a loading DDG state', () => {
      const key = 'test-key';
      const state = createDdgState(key, fetchedState.LOADING);
      expect(state).toEqual({ [key]: { state: fetchedState.LOADING } });
    });

    it('creates an error DDG state', () => {
      const key = 'test-key';
      const error = { message: 'Test error' };
      const state = createDdgState(key, fetchedState.ERROR, undefined, error);
      expect(state).toEqual({ [key]: { state: fetchedState.ERROR, error } });
    });

    it('creates a done DDG state with model', () => {
      const key = 'test-key';
      const model = { nodes: [], edges: [] };
      const viewModifiers = new Map([[1, 2]]);
      const state = createDdgState(key, fetchedState.DONE, model, undefined, viewModifiers);
      expect(state).toEqual({ [key]: { state: fetchedState.DONE, model, viewModifiers } });
    });
  });

  describe('createMetricsState', () => {
    it('creates a default metrics state', () => {
      const state = createMetricsState();
      expect(state.loading).toBe(false);
      expect(state.serviceMetrics).toBe(null);
    });

    it('applies overrides to the default metrics state', () => {
      const overrides = { loading: true, isATMActivated: true };
      const state = createMetricsState(overrides);
      expect(state.loading).toBe(true);
      expect(state.isATMActivated).toBe(true);
    });
  });

  describe('createPathAgnosticDecorationsState', () => {
    it('creates a default path agnostic decorations state', () => {
      const state = createPathAgnosticDecorationsState();
      expect(state).toEqual({});
    });

    it('creates a path agnostic decorations state with the given decorations', () => {
      const decorations = { decoration1: { withOp: {}, withOpMax: 10 } };
      const state = createPathAgnosticDecorationsState(decorations);
      expect(state).toEqual(decorations);
    });
  });

  describe('createTraceSearchState', () => {
    it('creates a default trace search state', () => {
      const state = createTraceSearchState();
      expect(state.search.query).toBe(null);
      expect(state.search.results).toEqual([]);
    });

    it('creates a trace search state with the given query and results', () => {
      const query = { service: 'test-service' };
      const results = ['trace1', 'trace2'];
      const state = createTraceSearchState(query, results);
      expect(state.search.query).toEqual(query);
      expect(state.search.results).toEqual(results);
    });

    it('creates a trace search state with loading state', () => {
      const query = { service: 'test-service' };
      const state = createTraceSearchState(query, [], fetchedState.LOADING);
      expect(state.search.query).toEqual(query);
      expect(state.search.state).toBe(fetchedState.LOADING);
    });

    it('creates a trace search state with error state', () => {
      const query = { service: 'test-service' };
      const error = new Error('Test error');
      const state = createTraceSearchState(query, [], fetchedState.ERROR, error);
      expect(state.search.query).toEqual(query);
      expect(state.search.state).toBe(fetchedState.ERROR);
      expect(state.search.error).toBe(error);
    });
  });
});