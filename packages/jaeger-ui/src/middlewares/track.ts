// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Action } from 'redux-actions';
import { Dispatch, Store } from 'redux';

import { middlewareHooks as timelineHooks } from '../components/TracePage/TraceTimelineViewer/duck.track';
import { isWaEnabled } from '../utils/tracking';
import { ReduxState } from '../types';

type TMiddlewareFn = (store: Store<ReduxState>, action: Action<any>) => void;

const middlewareHooks: { [actionType: string]: TMiddlewareFn } = { ...timelineHooks };

function trackingMiddleware(store: Store<ReduxState>) {
  return function inner(next: Dispatch<ReduxState>) {
    return function core(action: any) {
      const { type } = action;
      if (typeof middlewareHooks[type] === 'function') {
        middlewareHooks[type](store, action);
      }
      return next(action);
    };
  };
}

export default isWaEnabled ? trackingMiddleware : undefined;
