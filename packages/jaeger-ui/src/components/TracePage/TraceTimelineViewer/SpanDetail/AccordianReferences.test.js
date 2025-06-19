// Copyright (c) 2019 The Jaeger Authors.
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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccordianReferences, { References } from './AccordianReferences';

jest.mock('../../url/ReferenceLink', () => {
  return function MockReferenceLink({ children, reference }) {
    return (
      <div data-testid="reference-link" data-span-id={reference.spanID}>
        {children}
      </div>
    );
  };
});

const traceID = 'trace1';
const references = [
  {
    refType: 'CHILD_OF',
    span: {
      spanID: 'span1',
      traceID,
      operationName: 'op1',
      process: {
        serviceName: 'service1',
      },
    },
    spanID: 'span1',
    traceID,
  },
  {
    refType: 'CHILD_OF',
    span: {
      spanID: 'span3',
      traceID,
      operationName: 'op2',
      process: {
        serviceName: 'service2',
      },
    },
    spanID: 'span3',
    traceID,
  },
  {
    refType: 'CHILD_OF',
    spanID: 'span5',
    traceID: 'trace2',
  },
];

describe('<AccordianReferences>', () => {
  const props = {
    compact: false,
    data: references,
    highContrast: false,
    isOpen: false,
    onToggle: jest.fn(),
    focusSpan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component structure correctly without crashing', () => {
    render(<AccordianReferences {...props} />);

    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByText(`(${references.length})`)).toBeInTheDocument();

    const header = screen.getByText('References').closest('.AccordianReferences--header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('AccordianReferences--header');
  });

  it('displays References component content when accordion is expanded', () => {
    const expandedProps = { ...props, isOpen: true };
    render(<AccordianReferences {...expandedProps} />);

    const referencesList = screen.getByRole('list');
    expect(referencesList).toBeInTheDocument();
    expect(referencesList).toHaveClass('ReferencesList--List');

    const referenceLinks = screen.getAllByTestId('reference-link');
    expect(referenceLinks).toHaveLength(references.length);
  });
});

describe('<References>', () => {
  const props = {
    data: references,
    focusSpan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders complete references list with proper service names and operation details', () => {
    render(<References {...props} />);

    const referenceLinks = screen.getAllByTestId('reference-link');
    expect(referenceLinks).toHaveLength(references.length);

    expect(screen.getByText('service1')).toBeInTheDocument();
    expect(screen.getByText('op1')).toBeInTheDocument();

    expect(screen.getByText('service2')).toBeInTheDocument();
    expect(screen.getByText('op2')).toBeInTheDocument();

    expect(screen.getByText('< span in another trace >')).toBeInTheDocument();

    const refTypeElements = screen.getAllByText('CHILD_OF');
    expect(refTypeElements).toHaveLength(references.length);

    expect(screen.getByText('span1')).toBeInTheDocument();
    expect(screen.getByText('span3')).toBeInTheDocument();
    expect(screen.getByText('span5')).toBeInTheDocument();
  });
});
