// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createActions, handleActions, ActionFunctionAny } from 'redux-actions';

import { archiveTrace } from '../../../actions/jaeger-api';
import { ApiError } from '../../../types/api-error';
import {
  AcknowledgedTraceArchive,
  ErrorTraceArchive,
  LoadingTraceArchive,
  TraceArchive,
  TracesArchive,
} from '../../../types/archive';
import generateActionTypes from '../../../utils/generate-action-types';

type ArchiveAction = {
  meta: {
    id: string;
  };
  payload?: ApiError | string;
};

const initialState: TracesArchive = {};

const actionTypes = generateActionTypes('@jaeger-ui/archive-trace', ['ACKNOWLEDGE']);

const fullActions = createActions({
  [actionTypes.ACKNOWLEDGE]: traceID => traceID,
});

export const actions: { [actionType: string]: ActionFunctionAny<unknown> } = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(fullActions as any).jaegerUi.archiveTrace,
  archiveTrace,
};

function isLoading(traceArchive: TraceArchive): traceArchive is LoadingTraceArchive {
  return traceArchive && 'isLoading' in traceArchive && traceArchive.isLoading;
}

function acknowledge(state: TracesArchive, { payload }: ArchiveAction): TracesArchive {
  const traceID = typeof payload === 'string' ? payload : null;
  if (!traceID) {
    // make flow happy
    throw new Error('Invalid state, missing traceID for archive acknowledge');
  }
  const traceArchive = state[traceID];
  if (isLoading(traceArchive)) {
    // acknowledgement during loading is invalid (should not happen)
    return state;
  }

  const next: AcknowledgedTraceArchive = { ...traceArchive, isAcknowledged: true };
  return { ...state, [traceID]: next };
}

function archiveStarted(state: TracesArchive, { meta }: ArchiveAction): TracesArchive {
  return { ...state, [meta.id]: { isLoading: true } };
}

function archiveDone(state: TracesArchive, { meta }: ArchiveAction): TracesArchive {
  return { ...state, [meta.id]: { isArchived: true, isAcknowledged: false } };
}

function archiveErred(state: TracesArchive, { meta, payload }: ArchiveAction): TracesArchive {
  if (!payload) {
    // make flow happy
    throw new Error('Invalid state, missing API error details');
  }
  const traceArchive: ErrorTraceArchive = {
    error: payload,
    isArchived: false,
    isError: true,
    isAcknowledged: false,
  };
  return { ...state, [meta.id]: traceArchive };
}

export default handleActions(
  {
    [actionTypes.ACKNOWLEDGE]: acknowledge,
    [`${archiveTrace}_PENDING`]: archiveStarted,
    [`${archiveTrace}_FULFILLED`]: archiveDone,
    [`${archiveTrace}_REJECTED`]: archiveErred,
  },
  initialState
);
