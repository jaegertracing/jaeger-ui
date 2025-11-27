// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { handleActions } from 'redux-actions';

import { actionTypes } from '../actions/path-agnostic-decorations';
import { TNewData } from '../model/path-agnostic-decorations/types';
import TPathAgnosticDecorationsState from '../types/TPathAgnosticDecorationsState';
import guardReducer from '../utils/guardReducer';

export function getDecorationDone(state: TPathAgnosticDecorationsState, payload?: TNewData) {
  if (!payload) return state;
  return Object.keys(payload).reduce((newState, decorationID) => {
    const { withOp, withoutOp } = payload[decorationID];
    const newWithoutOpValues: number[] = [];
    if (withoutOp) {
      Object.keys(withoutOp).forEach(service => {
        const value = withoutOp[service];
        if (typeof value === 'number') newWithoutOpValues.push(value);
      });
    }

    const newWithOpValues: number[] = [];
    if (withOp) {
      Object.keys(withOp).forEach(service => {
        Object.keys(withOp[service]).forEach(operation => {
          const value = withOp[service][operation];
          if (typeof value === 'number') newWithOpValues.push(value);
        });
      });
    }

    if (newState[decorationID]) {
      const { withOpMax: currWithOpMax, withoutOpMax: currWithoutOpMax } = newState[decorationID];
      if (typeof currWithOpMax === 'number') newWithOpValues.push(currWithOpMax);
      if (typeof currWithoutOpMax === 'number') newWithoutOpValues.push(currWithoutOpMax);
      const withOpMax = Math.max(...newWithOpValues);
      const withoutOpMax = Math.max(...newWithoutOpValues);
      return {
        ...newState,
        [decorationID]: {
          withOp: withOp
            ? Object.keys(withOp).reduce(
                (newWithOp, service) => ({
                  ...newWithOp,
                  [service]: Object.assign({}, newWithOp[service], withOp[service]),
                }),
                newState[decorationID].withOp || {}
              )
            : newState[decorationID].withOp,
          withOpMax,
          withoutOp: withoutOp
            ? Object.assign({}, newState[decorationID].withoutOp, withoutOp)
            : newState[decorationID].withoutOp,
          withoutOpMax,
        },
      };
    }
    const withOpMax = Math.max(...newWithOpValues);
    const withoutOpMax = Math.max(...newWithoutOpValues);
    return {
      ...newState,
      [decorationID]: {
        withOp,
        withOpMax,
        withoutOp,
        withoutOpMax,
      },
    };
  }, state);
}

export default handleActions(
  {
    [`${actionTypes.GET_DECORATION}_FULFILLED`]: guardReducer<
      TPathAgnosticDecorationsState,
      TNewData | undefined
    >(getDecorationDone),
  },
  {}
);
