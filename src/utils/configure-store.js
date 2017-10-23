// Copyright (c) 2017 Uber Technologies, Inc.
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

import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { routerReducer, routerMiddleware } from 'react-router-redux';
import { window } from 'global';

import jaegerReducers from '../reducers';
import * as jaegerMiddlewares from '../middlewares';
import traceTimelineViewReducer from '../components/TracePage/TraceTimelineViewer/duck';

export default function configureStore(history) {
  return createStore(
    combineReducers({
      ...jaegerReducers,
      traceTimeline: traceTimelineViewReducer,
      routing: routerReducer,
    }),
    compose(
      applyMiddleware(
        ...[...Object.keys(jaegerMiddlewares).map(key => jaegerMiddlewares[key]), routerMiddleware(history)]
      ),
      window && window.devToolsExtension ? window.devToolsExtension() : noop => noop
    )
  );
}
