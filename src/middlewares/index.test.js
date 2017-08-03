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

import sinon from 'sinon';
import { change } from 'redux-form';
import * as jaegerMiddlewares from './index';
import { fetchServiceOperations } from '../actions/jaeger-api';

it('jaegerMiddlewares should contain the promise middleware', () => {
  expect(typeof jaegerMiddlewares.promise).toBe('function');
});

it('loadOperationsForServiceMiddleware fetches operations for services', () => {
  const { loadOperationsForServiceMiddleware } = jaegerMiddlewares;
  const dispatch = sinon.spy();
  const next = sinon.spy();
  const action = change('searchSideBar', 'service', 'yo');
  loadOperationsForServiceMiddleware({ dispatch })(next)(action);
  expect(dispatch.calledWith(fetchServiceOperations('yo'))).toBeTruthy();
  expect(dispatch.calledWith(change('searchSideBar', 'operation', 'all'))).toBeTruthy();
});
