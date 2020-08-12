/**
 * Copyright (c) 2020 The Jaeger Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import TraceIDSearchInput from './TraceIDSearchInput';

describe('<TraceIDSearchInput />', () => {
  let wrapper;
  let history;

  beforeEach(() => {
    history = createMemoryHistory();
    wrapper = mount(
      <Router history={history}>
        <TraceIDSearchInput />
      </Router>
    ).find('form');
  });

  it('renders as expected', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('pushes input id to history', () => {
    const idInput = wrapper.find('input');
    const traceId = 'MOCK-TRACE-ID';
    idInput.instance().value = traceId;

    wrapper.simulate('submit');

    expect(history.length).toEqual(2);
    expect(history.location.pathname).toEqual(`/trace/${traceId}`);
  });

  it('does not push to history on falsy input value', () => {
    wrapper.simulate('submit');

    expect(history.length).toEqual(1);
  });
});
