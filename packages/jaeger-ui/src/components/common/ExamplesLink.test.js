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

import ExamplesLink from './ExamplesLink';

describe('ExamplesLink', () => {
  const traceLinks = [
    {
      traceID: 'foo',
    },
    {
      traceID: 'bar',
    },
    {
      traceID: 'baz',
    },
  ];
  const spanLinks = traceLinks.map(({ traceID }, i) => ({
    traceID: `${traceID}${i}`,
    spanIDs: new Array(i + 1).fill('spanID').map((str, j) => `${str}${i}${j}`),
  }));

  it('renders null when props.examples is absent', () => {
    expect(shallow(<ExamplesLink />).type()).toBe(null);
  });

  it('renders null when props.examples is empty', () => {
    expect(shallow(<ExamplesLink examples={[]} />).type()).toBe(null);
  });

  it('renders as expected when given trace links', () => {
    expect(shallow(<ExamplesLink examples={traceLinks} />)).toMatchSnapshot();
  });

  it('renders as expected when given span links', () => {
    expect(shallow(<ExamplesLink examples={spanLinks} />)).toMatchSnapshot();
  });

  it('renders as expected when given both span and trace links', () => {
    expect(shallow(<ExamplesLink examples={spanLinks.concat(traceLinks)} />)).toMatchSnapshot();
  });

  it('renders label text iff props.includeText is true', () => {
    expect(
      shallow(<ExamplesLink examples={traceLinks} />)
        .find('a')
        .props().children[0]
    ).toBe(undefined);
    expect(
      shallow(<ExamplesLink examples={traceLinks} includeText />)
        .find('a')
        .props().children[0]
    ).toBe('Examples ');
  });
});
