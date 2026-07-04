// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('../utils');

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import DetailState from './DetailState';
import SpanDetail from './index';
import { formatDuration, formatDurationCompact } from '../utils';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';

vi.mock('./AccordionAttributes', () => {
  return mockDefault(function MockAccordionAttributes({ label, onToggle }) {
    return (
      <div data-testid={`accordian-keyvalues-${label.toLowerCase()}`}>
        <button type="button" onClick={onToggle} data-testid={`toggle-${label.toLowerCase()}`}>
          Toggle {label}
        </button>
      </div>
    );
  });
});

vi.mock('./AccordionEvents', () => {
  return mockDefault(function MockAccordionEvents({ onToggle, onItemToggle }) {
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
  });
});

vi.mock('./AccordionLinks', () => {
  return mockDefault(function MockAccordionLinks({ onToggle }) {
    return (
      <div data-testid="accordion-links">
        <button type="button" onClick={onToggle} data-testid="toggle-links">
          Toggle Links
        </button>
      </div>
    );
  });
});

vi.mock('./AccordionText', () => {
  return mockDefault(function MockAccordionText({ onToggle }) {
    return (
      <div data-testid="accordian-warnings">
        <button type="button" onClick={onToggle} data-testid="toggle-warnings">
          Toggle Warnings
        </button>
      </div>
    );
  });
});

vi.mock('../../../common/CopyIcon', () => {
  return mockDefault(function MockCopyIcon({ copyText }) {
    return (
      <button type="button" data-testid="copy-icon" data-copy-text={copyText}>
        Copy
      </button>
    );
  });
});

vi.mock('./GenAITab', () => {
  return mockDefault(function MockGenAITab() {
    return <div data-testid="genai-tab">GenAI Tab</div>;
  });
});

const { isGenAISpanMock } = vi.hoisted(() => ({
  isGenAISpanMock: vi.fn(() => false),
}));
vi.mock('../../../../utils/genai', () => ({
  isGenAISpan: isGenAISpanMock,
}));

describe('<SpanDetail>', () => {
  let props;
  let spanData;
  let span;
  let detailState;

  beforeEach(() => {
    formatDuration.mockReset();
    formatDuration.mockImplementation(duration => `${duration}ms`);
    formatDurationCompact.mockReset();
    formatDurationCompact.mockImplementation(duration => `${duration}ms`);

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

  it('renders overview items with duration and start time in a table', () => {
    render(<SpanDetail {...props} />);

    // Check that service name is in the heading
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(span.resource.serviceName);
    expect(heading).toHaveTextContent(span.name);

    // Scope all overview assertions to the overview table to prevent false positives
    // if the same text appears elsewhere in the component tree
    const overviewTable = screen.getByRole('table', { name: 'Span Overview' });
    const { getByText, getByRole } = within(overviewTable);

    // Check labels
    expect(getByRole('rowheader', { name: 'Duration:' })).toBeInTheDocument();
    expect(getByRole('rowheader', { name: 'Start Time:' })).toBeInTheDocument();

    // Check that the mocked formatted values are rendered in the correct cells
    expect(getByText(`${span.duration}ms`)).toBeInTheDocument();
    expect(getByText(`${span.relativeStartTime}ms`)).toBeInTheDocument();
  });

  it('renders span tags accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const tagsAccordian = screen.getByTestId('accordian-keyvalues-tags');
    expect(tagsAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-tags');
    fireEvent.click(toggleButton);

    expect(props.attributesToggle).toHaveBeenCalledWith(span.spanID);
  });

  it('renders process tags accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const processAccordian = screen.getByTestId('accordian-keyvalues-process');
    expect(processAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-process');
    fireEvent.click(toggleButton);

    expect(props.resourceToggle).toHaveBeenCalledWith(span.spanID);
  });

  it('renders logs accordian and triggers both main toggle and item toggle callbacks', () => {
    render(<SpanDetail {...props} />);

    const logsAccordian = screen.getByTestId('accordian-logs');
    expect(logsAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-logs');
    fireEvent.click(toggleButton);
    expect(props.eventsToggle).toHaveBeenCalledWith(span.spanID);

    const logItemButton = screen.getByTestId('toggle-log-item');
    fireEvent.click(logItemButton);
    expect(props.eventItemToggle).toHaveBeenCalledWith(span.spanID, 'test-log');
  });

  it('renders warnings accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const warningsAccordian = screen.getByTestId('accordian-warnings');
    expect(warningsAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-warnings');
    fireEvent.click(toggleButton);

    expect(props.warningsToggle).toHaveBeenCalledWith(span.spanID);
  });

  it('renders references accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const referencesAccordian = screen.getByTestId('accordion-links');
    expect(referencesAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-links');
    fireEvent.click(toggleButton);

    expect(props.linksToggle).toHaveBeenCalledWith(span.spanID);
  });

  it('renders copy icon with deep link URL containing the span ID parameter', () => {
    render(<SpanDetail {...props} />);

    const copyIcon = screen.getByTestId('copy-icon');
    const copyText = copyIcon.getAttribute('data-copy-text');

    expect(copyIcon).toBeInTheDocument();
    expect(copyText).toContain(`?uiFind=${props.span.spanID}`);
  });

  describe('GenAI tab', () => {
    beforeEach(() => {
      isGenAISpanMock.mockReset();
    });

    it('does not show the GenAI tab when the span has no gen_ai.* attributes', () => {
      isGenAISpanMock.mockReturnValue(false);
      render(<SpanDetail {...props} />);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('shows the GenAI tab when the span has gen_ai.* attributes', () => {
      isGenAISpanMock.mockReturnValue(true);
      render(<SpanDetail {...props} />);
      expect(screen.getByRole('tab', { name: 'GenAI' })).toBeInTheDocument();
    });

    it('renders no tab bar for a non-GenAI span — content is shown directly', () => {
      isGenAISpanMock.mockReturnValue(false);
      render(<SpanDetail {...props} />);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('accordian-keyvalues-tags')).toBeInTheDocument();
    });

    it('defaults to the Details tab for a GenAI span', () => {
      isGenAISpanMock.mockReturnValue(true);
      render(<SpanDetail {...props} />);
      expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'GenAI' })).toHaveAttribute('aria-selected', 'false');
    });
  });
});
