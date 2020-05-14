// Copyright (c) 2020 Uber Technologies, Inc.
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

import React from 'react';
import { shallow } from 'enzyme';
import { List } from 'antd';

import DetailList from './DetailList';

describe('DetailList', () => {
  const details = ['foo', 'bar', 'baz'];

  it('renders list as expected', () => {
    expect(shallow(<DetailList details={details} />)).toMatchSnapshot();
  });

  it('renders item as expected', () => {
    const renderItem = shallow(<DetailList details={details} />)
      .find(List)
      .prop('renderItem');
    expect(shallow(<div>{renderItem(details[0])}</div>)).toMatchSnapshot();
  });
});
