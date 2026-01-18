// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import ReferencesButton from './ReferencesButton';
import transformTraceData from '../../../model/transform-trace-data';
import traceGenerator from '../../../demo/trace-generators';

jest.mock('../url/ReferenceLink', () => {
  const MockReferenceLink = ({ children, className, link, focusSpan }) => (
    <a
      className={className}
      data-testid="reference-link"
      data-spanid={link.spanID}
      data-traceid={link.traceID}
      role="button"
      onClick={() => focusSpan(link.spanID)}
    >
      {children}
    </a>
  );
  MockReferenceLink.displayName = 'ReferenceLink';
  return MockReferenceLink;
});

jest.mock('../../common/NewWindowIcon', () => () => <span data-testid="new-window-icon">↗</span>);

describe('<ReferencesButton>', () => {
  const trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 10 }));

  // Create OTEL links from legacy references
  const oneLink = [
    {
      traceID: trace.spans[0].traceID,
      spanID: trace.spans[0].spanID,
      attributes: [],
      span: {
        spanID: trace.spans[0].spanID,
        resource: { serviceName: trace.spans[0].process.serviceName },
        name: trace.spans[0].operationName,
      },
    },
  ];

  const externalSpanID = 'extSpan';
  const moreLinks = [
    {
      traceID: trace.traceID,
      spanID: trace.spans[1].spanID,
      attributes: [],
      span: {
        spanID: trace.spans[1].spanID,
        resource: { serviceName: trace.spans[1].process.serviceName },
        name: trace.spans[1].operationName,
      },
    },
    {
      traceID: trace.traceID,
      spanID: trace.spans[2].spanID,
      attributes: [],
      span: {
        spanID: trace.spans[2].spanID,
        resource: { serviceName: trace.spans[2].process.serviceName },
        name: trace.spans[2].operationName,
      },
    },
    {
      traceID: 'otherTrace',
      spanID: externalSpanID,
      attributes: [],
      // No span property - external trace
    },
  ];

  const baseProps = {
    focusSpan: jest.fn(),
    tooltipText: 'Test tooltip text',
    children: <span data-testid="button-children">References</span>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a single link directly', () => {
    render(<ReferencesButton {...baseProps} links={oneLink} />);

    const trigger = screen.getByTestId('button-children').closest('a');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass('ReferencesButton-MultiParent');

    fireEvent.click(trigger);
    expect(baseProps.focusSpan).toHaveBeenCalledWith(oneLink[0].spanID);
  });

  it('renders multiple links as dropdown menu items', async () => {
    render(<ReferencesButton {...baseProps} links={moreLinks} />);

    const trigger = screen.getByTestId('button-children').closest('a');
    expect(trigger).toHaveClass('ReferencesButton-MultiParent');
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    // Find dropdown items (they're rendered as anchors with role="button")
    const dropdownItems = await screen.findAllByRole('button', { hidden: false });
    // Filter to get just the link items (not the trigger itself)
    const linkItems = dropdownItems.filter(item => item.classList.contains('ReferencesButton--TraceRefLink'));

    expect(linkItems.length).toBeGreaterThan(0);

    // Check that the external span has the new window icon
    const externalLinkText = linkItems.find(item => item.textContent.includes(externalSpanID));
    expect(externalLinkText).toBeInTheDocument();
  });
});
