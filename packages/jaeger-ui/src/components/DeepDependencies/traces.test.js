// Copyright (c) 2019 Uber Technologies, Inc.
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

import * as React from 'react';
import { shallow } from 'enzyme';
import queryString from 'query-string';

import { DeepDependencyGraphPageImpl } from '.';
import { TracesDdgImpl /* , mapStateToProps */ } from './traces';
import { ROUTE_PATH } from '../SearchTracePage/url';

describe('TracesDdg', () => {
  it('renders DeepDependencyGraphPageImpl with specific props', () => {
    const passProps = {
      propName0: 'propValue0',
      propName1: 'propValue1',
    };
    const extraUrlArgs = ['end', 'start', 'limit', 'lookback', 'maxDuration', 'minDuration', 'view'].reduce(
      (curr, key) => ({
        ...curr,
        [key]: `test ${key}`,
      }),
      {}
    );
    const search = queryString.stringify({ ...extraUrlArgs, extraParam: 'extraParam' });

    const wrapper = shallow(<TracesDdgImpl location={{ search }} {...passProps} />);
    const ddgPage = wrapper.find(DeepDependencyGraphPageImpl);
    expect(ddgPage.props()).toEqual(
      expect.objectContaining({
        ...passProps,
        baseUrl: ROUTE_PATH,
        extraUrlArgs,
        showSvcOpsHeader: false,
      })
    );
  });

  describe('mapStateToProps()', () => {
    /* TODO After merging in master */
  });
});
