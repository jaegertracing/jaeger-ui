// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccordionLinks, { References } from './AccordionLinks';

jest.mock('../../url/ReferenceLink', () => {
  return function MockReferenceLink({ children, link }) {
    return (
      <div data-testid="link-link" data-span-id={link.spanID}>
        {children}
      </div>
    );
  };
});

const traceID = 'trace1';
const links = [
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

describe('<AccordionLinks>', () => {
  const props = {
    compact: false,
    data: links,
    highContrast: false,
    isOpen: false,
    onToggle: jest.fn(),
    focusSpan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component structure correctly without crashing', () => {
    render(<AccordionLinks {...props} />);

    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByText(`(${links.length})`)).toBeInTheDocument();

    const header = screen.getByText('References').closest('.AccordionLinks--header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('AccordionLinks--header');
  });

  it('displays References component content when accordion is expanded', () => {
    const expandedProps = { ...props, isOpen: true };
    render(<AccordionLinks {...expandedProps} />);

    const linksList = screen.getByRole('list');
    expect(linksList).toBeInTheDocument();
    expect(linksList).toHaveClass('ReferencesList--List');

    const linkLinks = screen.getAllByTestId('link-link');
    expect(linkLinks).toHaveLength(links.length);
  });
});

describe('<References>', () => {
  const props = {
    data: links,
    focusSpan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders complete links list with proper service names and operation details', () => {
    render(<References {...props} />);

    const linkLinks = screen.getAllByTestId('link-link');
    expect(linkLinks).toHaveLength(links.length);

    expect(screen.getByText('service1')).toBeInTheDocument();
    expect(screen.getByText('op1')).toBeInTheDocument();

    expect(screen.getByText('service2')).toBeInTheDocument();
    expect(screen.getByText('op2')).toBeInTheDocument();

    expect(screen.getByText('< span in another trace >')).toBeInTheDocument();

    const refTypeElements = screen.getAllByText('CHILD_OF');
    expect(refTypeElements).toHaveLength(links.length);

    expect(screen.getByText('span1')).toBeInTheDocument();
    expect(screen.getByText('span3')).toBeInTheDocument();
    expect(screen.getByText('span5')).toBeInTheDocument();
  });
});
