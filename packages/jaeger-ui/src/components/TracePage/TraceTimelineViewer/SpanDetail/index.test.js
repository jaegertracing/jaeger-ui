// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('../utils');

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import DetailState from './DetailState';
import SpanDetail from './index';
import { formatDuration } from '../utils';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';
import OtelSpanFacade from '../../../../model/OtelSpanFacade';

jest.mock('./AccordionAttributes', () => {
  return function MockAccordionAttributes({ label, onToggle }) {
    return (
      <div data-testid={`accordian-keyvalues-${label.toLowerCase()}`}>
        <button type="button" onClick={onToggle} data-testid={`toggle-${label.toLowerCase()}`}>
          Toggle {label}
        </button>
      </div>
    );
  };
});

jest.mock('./AccordionEvents', () => {
  return function MockAccordionEvents({ onToggle, onItemToggle }) {
    return (
      <div data-testid="accordian-logs">
        <button type="button" onClick={onToggle} data-testid="toggle-logs">
          Toggle Logs
        </button>
        <button type="button" onClick={() => onItemToggle('test-log')} data-testid="toggle-log-item">
          Toggle Log Item
        </button>
      </div>
    );
  };
});

jest.mock('./AccordionLinks', () => {
  return function MockAccordionLinks({ onToggle }) {
    return (
      <div data-testid="accordion-links">
        <button type="button" onClick={onToggle} data-testid="toggle-links">
          Toggle Links
        </button>
      </div>
    );
  };
});

jest.mock('./AccordionText', () => {
  return function MockAccordionText({ onToggle }) {
    return (
      <div data-testid="accordian-warnings">
        <button type="button" onClick={onToggle} data-testid="toggle-warnings">
          Toggle Warnings
        </button>
      </div>
    );
  };
});

jest.mock('../../../common/LabeledList', () => {
  return function MockLabeledList({ items }) {
    return (
      <div data-testid="labeled-list">
        {items.map(item => (
          <div key={item.key} data-testid={`item-${item.key}`}>
            {item.label} {item.value}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../common/CopyIcon', () => {
  return function MockCopyIcon({ copyText }) {
    return (
      <button type="button" data-testid="copy-icon" data-copy-text={copyText}>
        Copy
      </button>
    );
  };
});

describe('<SpanDetail>', () => {
  let props;
  let spanData;
  let span;
  let detailState;

  beforeEach(() => {
    formatDuration.mockReset();
    formatDuration.mockImplementation(duration => `${duration}ms`);

    const rawTrace = traceGenerator.trace({ numberOfSpans: 1 });
    spanData = rawTrace.spans[0];

    spanData.logs = [
      {
        timestamp: 10,
        fields: [
          { key: 'message', value: 'oh the log message' },
          { key: 'something', value: 'else' },
        ],
      },
      {
        timestamp: 20,
        fields: [
          { key: 'message', value: 'oh the next log message' },
          { key: 'more', value: 'stuff' },
        ],
      },
    ];

    spanData.warnings = ['Warning 1', 'Warning 2'];

    spanData.references = [
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

    // Transform the span data and then convert to OTEL span
    const transformedTrace = transformTraceData({ ...rawTrace, spans: [spanData] });
    span = transformedTrace.asOtelTrace().spans[0];

    detailState = new DetailState().toggleEvents().toggleResource().toggleLinks().toggleAttributes();
    const traceStartTime = 5;

    props = {
      detailState,
      span,
      traceStartTime,
      currentViewRangeTime: [0, 100],
      traceDuration: 1000,
      eventItemToggle: jest.fn(),
      eventsToggle: jest.fn(),
      resourceToggle: jest.fn(),
      attributesToggle: jest.fn(),
      warningsToggle: jest.fn(),
      linksToggle: jest.fn(),
      focusSpan: jest.fn(),
      linksGetter: jest.fn(),
    };
  });

  it('renders the component successfully without errors', () => {
    render(<SpanDetail {...props} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('displays the span operation name as the main heading', () => {
    render(<SpanDetail {...props} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(span.name);
  });

  it('renders overview items with service name, duration and start time labels', () => {
    render(<SpanDetail {...props} />);

    const labeledList = screen.getByTestId('labeled-list');
    expect(labeledList).toBeInTheDocument();

    expect(screen.getByTestId('item-svc')).toBeInTheDocument();
    expect(screen.getByTestId('item-duration')).toBeInTheDocument();
    expect(screen.getByTestId('item-start')).toBeInTheDocument();

    expect(screen.getByTestId('item-svc')).toHaveTextContent('Service:');
    expect(screen.getByTestId('item-duration')).toHaveTextContent('Duration:');
    expect(screen.getByTestId('item-start')).toHaveTextContent('Start Time:');
  });

  it('renders span tags accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const tagsAccordian = screen.getByTestId('accordian-keyvalues-tags');
    expect(tagsAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-tags');
    fireEvent.click(toggleButton);

    expect(props.attributesToggle).toHaveBeenCalledWith(span.spanId);
  });

  it('renders process tags accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const processAccordian = screen.getByTestId('accordian-keyvalues-process');
    expect(processAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-process');
    fireEvent.click(toggleButton);

    expect(props.resourceToggle).toHaveBeenCalledWith(span.spanId);
  });

  it('renders logs accordian and triggers both main toggle and item toggle callbacks', () => {
    render(<SpanDetail {...props} />);

    const logsAccordian = screen.getByTestId('accordian-logs');
    expect(logsAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-logs');
    fireEvent.click(toggleButton);
    expect(props.eventsToggle).toHaveBeenCalledWith(span.spanId);

    const logItemButton = screen.getByTestId('toggle-log-item');
    fireEvent.click(logItemButton);
    expect(props.eventItemToggle).toHaveBeenCalledWith(span.spanId, 'test-log');
  });

  it('renders warnings accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const warningsAccordian = screen.getByTestId('accordian-warnings');
    expect(warningsAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-warnings');
    fireEvent.click(toggleButton);

    expect(props.warningsToggle).toHaveBeenCalledWith(span.spanId);
  });

  it('renders references accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const referencesAccordian = screen.getByTestId('accordion-links');
    expect(referencesAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-links');
    fireEvent.click(toggleButton);

    expect(props.linksToggle).toHaveBeenCalledWith(span.spanId);
  });

  it('renders copy icon with deep link URL containing the span ID parameter', () => {
    render(<SpanDetail {...props} />);

    const copyIcon = screen.getByTestId('copy-icon');
    const copyText = copyIcon.getAttribute('data-copy-text');

    expect(copyIcon).toBeInTheDocument();
    expect(copyText).toContain(`?uiFind=${props.span.spanId}`);
  });
});
