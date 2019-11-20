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

import React from 'react';
import { mount } from 'enzyme';
import AccordianReferences, { References } from './AccordianReferences';

/*
export type SpanReference = {
  refType: 'CHILD_OF' | 'FOLLOWS_FROM';
  // eslint-disable-next-line no-use-before-define
  span: Span | null | undefined;
  spanID: string;
  traceID: string;
};

 */
const references = [
  {
    refType: 'CHILD_OF',
    span: {
      spanID: 'span2',
      traceID: 'trace1',
      operationName: 'op1',
      process: {
        serviceName: 'service1',
      },
    },
    spanID: 'span1',
    traceID: 'trace1',
  },
  {
    refType: 'CHILD_OF',
    span: {
      spanID: 'span3',
      traceID: 'trace1',
      operationName: 'op2',
      process: {
        serviceName: 'service2',
      },
    },
    spanID: 'span4',
    traceID: 'trace1',
  },
  {
    refType: 'CHILD_OF',
    span: {
      spanID: 'span6',
      traceID: 'trace2',
      operationName: 'op2',
      process: {
        serviceName: 'service2',
      },
    },
    spanID: 'span5',
    traceID: 'trace2',
  },
];

describe('<AccordianReferences>', () => {
  let wrapper;
  const mockFocusSpan = jest.fn();

  const props = {
    compact: false,
    data: references,
    highContrast: false,
    isOpen: false,
    label: 'le-label',
    onToggle: jest.fn(),
    focusSpan: mockFocusSpan,
  };

  beforeEach(() => {
    wrapper = mount(<AccordianReferences {...props} />);
    mockFocusSpan.mockReset();
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the label', () => {
    const header = wrapper.find(`.AccordianReferences--header > strong`);
    expect(header.length).toBe(1);
    expect(header.text()).toBe(props.label);
  });

  it('renders the content when it is expanded', () => {
    wrapper.setProps({ isOpen: true });
    const content = wrapper.find(References);
    expect(content.length).toBe(1);
    expect(content.prop('data')).toBe(references);
    const links = content.find('a');
    expect(links.length).toBe(references.length);
  });

  it('call spanFocus when click on item', () => {
    wrapper.setProps({ isOpen: true });
    const content = wrapper.find(References);
    content
      .find('a')
      .at(0)
      .simulate('click');
    expect(mockFocusSpan).toHaveBeenLastCalledWith(references[0].spanID);
  });
});
