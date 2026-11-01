// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { fetchedState } from '../constants';
import type { TDdgModel } from '../model/ddg/types';
import type { ApiError } from '../types/api-error';
import { graphStateFromDdgQuery } from './ddgGraphState';

const mockModel = {
  hash: 'test-hash',
  distanceToPathElems: new Map(),
  paths: [],
  services: new Map(),
  visIdxToPathElem: [],
} as TDdgModel;

describe('graphStateFromDdgQuery', () => {
  it('returns LOADING when the query is pending', () => {
    expect(
      graphStateFromDdgQuery({
        data: undefined,
        error: null,
        isPending: true,
        isLoading: false,
        isFetching: true,
      })
    ).toEqual({ state: fetchedState.LOADING });
  });

  it('returns LOADING when isLoading and data is not yet available', () => {
    expect(
      graphStateFromDdgQuery({
        data: undefined,
        error: null,
        isPending: false,
        isLoading: true,
        isFetching: true,
      })
    ).toEqual({ state: fetchedState.LOADING });
  });

  it('returns ERROR when the query failed', () => {
    const error = new Error('fetch failed') as ApiError;
    expect(
      graphStateFromDdgQuery({
        data: undefined,
        error,
        isPending: false,
        isLoading: false,
        isFetching: false,
      })
    ).toEqual({ state: fetchedState.ERROR, error });
  });

  it('returns DONE when data is present even if a background refetch errored', () => {
    const error = new Error('refetch failed') as ApiError;
    expect(
      graphStateFromDdgQuery({
        data: mockModel,
        error,
        isPending: false,
        isLoading: false,
        isFetching: false,
      })
    ).toEqual({ state: fetchedState.DONE, model: mockModel });
  });

  it('returns DONE with the model when data is present', () => {
    expect(
      graphStateFromDdgQuery({
        data: mockModel,
        error: null,
        isPending: false,
        isLoading: false,
        isFetching: false,
      })
    ).toEqual({ state: fetchedState.DONE, model: mockModel });
  });

  it('returns undefined when idle with no data or error', () => {
    expect(
      graphStateFromDdgQuery({
        data: undefined,
        error: null,
        isPending: false,
        isLoading: false,
        isFetching: false,
      })
    ).toBeUndefined();
  });
});
