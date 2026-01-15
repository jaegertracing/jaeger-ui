// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccordionLinks, { References } from './AccordionLinks';

jest.mock('../../url/ReferenceLink', () => {
  return function MockReferenceLink({ children, link }) {
    return (
      <div data-testid="reference-link" data-span-id={link.spanID}>
        {children}
      </div>
    );
  };
});

const traceID = 'trace1';
const links = [
  {
    span: {
      spanID: 'span1',
      traceID,
      name: 'op1',
      resource: {
        serviceName: 'service1',
      },
    },
    spanID: 'span1',
    traceID,
  },
  {
    span: {
      spanID: 'span3',
      traceID,
      name: 'op2',
      resource: {
        serviceName: 'service2',
      },
    },
    spanID: 'span3',
    traceID,
  },
  {
    spanID: 'span5',
    traceID: 'trace2',
  },
];

describe('<AccordionLinks /> – functional component', () => {
  const baseProps = {
    data: links,
    highContrast: false,
    isOpen: false,
    onToggle: jest.fn(),
    focusSpan: jest.fn(),
    useOtelTerms: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header, label, and count correctly', () => {
    render(<AccordionLinks {...baseProps} />);

    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByText(`(${links.length})`)).toBeInTheDocument();

    const header = screen.getByText('References').closest('.AccordionLinks--header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('AccordionLinks--header');
    expect(header).not.toHaveClass('is-open');
  });

  it('renders "Links" label when useOtelTerms is true', () => {
    render(<AccordionLinks {...baseProps} useOtelTerms={true} />);

    expect(screen.getByText('Links')).toBeInTheDocument();
  });

  it('does not render References list when closed', () => {
    render(<AccordionLinks {...baseProps} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders References list when open', () => {
    render(<AccordionLinks {...baseProps} isOpen={true} />);

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveClass('ReferencesList--List');

    const renderedLinks = screen.getAllByTestId('reference-link');
    expect(renderedLinks).toHaveLength(links.length);
  });

  it('calls onToggle when header is clicked', () => {
    render(<AccordionLinks {...baseProps} />);

    const header = screen.getByText('References').closest('.AccordionLinks--header');
    expect(header).toBeInTheDocument();

    if (header) {
      fireEvent.click(header);
    }

    expect(baseProps.onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('<References />', () => {
  const props = {
    data: links,
    focusSpan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders full references list with service, operation, and span IDs', () => {
    render(<References {...props} />);

    const renderedLinks = screen.getAllByTestId('reference-link');
    expect(renderedLinks).toHaveLength(links.length);

    // spans with data
    expect(screen.getByText('service1')).toBeInTheDocument();
    expect(screen.getByText('op1')).toBeInTheDocument();

    expect(screen.getByText('service2')).toBeInTheDocument();
    expect(screen.getByText('op2')).toBeInTheDocument();

    // span without data
    expect(screen.getByText('< span in another trace >')).toBeInTheDocument();

    // span IDs
    expect(screen.getByText('span1')).toBeInTheDocument();
    expect(screen.getByText('span3')).toBeInTheDocument();
    expect(screen.getByText('span5')).toBeInTheDocument();
  });
});
