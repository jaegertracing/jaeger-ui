// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('../utils');

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import DetailState from './DetailState';
import SpanDetail from './index';
import { formatDuration, formatDurationCompact, isErrorSpan } from '../utils';
import { makeAttributes } from '../../../../model/attributes';
import { makeTrace } from '../../../../model/test/otlp-builders';

const OTHER_TRACE_ID = '0123456789abcdef0123456789abcdef';

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
  let span;
  let detailState;

  beforeEach(() => {
    formatDuration.mockReset();
    formatDuration.mockImplementation(duration => `duration:${duration}`);
    formatDurationCompact.mockReset();
    formatDurationCompact.mockImplementation(duration => `compact:${duration}`);
    isErrorSpan.mockReset();

    const trace = makeTrace(
      [
        {
          id: 'span',
          name: 'GET /cart',
          service: 'frontend',
          start: 100,
          duration: 500,
          attributes: { 'http.method': 'GET', 'http.status_code': 200 },
          events: [
            { name: 'oh the log message', time: 110, attributes: { something: 'else' } },
            { name: 'oh the next log message', time: 120, attributes: { more: 'stuff' } },
          ],
          links: [{ id: 'span1' }, { id: 'span4' }, { id: 'span5', traceId: OTHER_TRACE_ID }],
          warnings: ['Warning 1', 'Warning 2'],
        },
      ],
      { resource: { hostname: 'frontend-1', ip: '10.0.0.1' } }
    );
    span = trace.spans[0];

    detailState = new DetailState().toggleEvents().toggleResource().toggleLinks().toggleAttributes();

    props = {
      detailState,
      span,
      traceStartTime: trace.startTime,
      currentViewRangeTime: [0, 100],
      traceDuration: trace.duration,
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

  it('displays the service and operation in the heading with the timeline label tooltip', () => {
    render(<SpanDetail {...props} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(span.resource.serviceName);
    expect(heading).toHaveTextContent(span.name);
    expect(heading).toHaveAttribute('title', `${span.resource.serviceName}::${span.name}`);
  });

  it('renders overview items with duration and start time beside the heading', () => {
    render(<SpanDetail {...props} />);

    // Check that service name is in the heading
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(span.resource.serviceName);
    expect(heading).toHaveTextContent(span.name);

    // Scope all overview assertions to the overview list to prevent false positives
    // if the same text appears elsewhere in the component tree
    const overview = screen.getByRole('group', { name: 'Span overview' });
    const { getByText } = within(overview);

    // Check labels
    expect(getByText('Duration:')).toBeInTheDocument();
    expect(getByText('Start Time:')).toBeInTheDocument();

    // Check that the mocked formatted values are rendered
    expect(getByText(`compact:${span.duration}`)).toBeInTheDocument();
    expect(getByText(`duration:${span.relativeStartTime}`)).toBeInTheDocument();
  });

  it('marks a span with an error status in the heading, and only such a span', () => {
    const { rerender } = render(<SpanDetail {...props} />);
    expect(screen.queryByRole('img', { name: 'Error' })).toBeNull();

    isErrorSpan.mockReturnValue(true);
    rerender(<SpanDetail {...props} />);
    expect(
      within(screen.getByRole('heading', { level: 2 })).getByRole('img', { name: 'Error' })
    ).toBeInTheDocument();
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

    it('shows the GenAI tab when the span has recognized gen_ai.* attributes', () => {
      isGenAISpanMock.mockReturnValue(true);
      Object.defineProperty(span, 'attributes', {
        value: makeAttributes([{ key: 'gen_ai.provider.name', value: 'openai' }]),
      });
      render(<SpanDetail {...props} />);
      expect(screen.getByRole('tab', { name: 'GenAI' })).toBeInTheDocument();
    });

    it('does not show the GenAI tab when all gen_ai.* attributes are unrecognized', () => {
      isGenAISpanMock.mockReturnValue(true);
      Object.defineProperty(span, 'attributes', {
        value: makeAttributes([{ key: 'gen_ai.unrecognized', value: 'low signal' }]),
      });
      render(<SpanDetail {...props} />);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('accordian-keyvalues-tags')).toBeInTheDocument();
    });

    it('renders no tab bar for a non-GenAI span — content is shown directly', () => {
      isGenAISpanMock.mockReturnValue(false);
      render(<SpanDetail {...props} />);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('accordian-keyvalues-tags')).toBeInTheDocument();
    });

    it('defaults to the GenAI tab for a GenAI span, now that it has real content', () => {
      isGenAISpanMock.mockReturnValue(true);
      Object.defineProperty(span, 'attributes', {
        value: makeAttributes([{ key: 'gen_ai.provider.name', value: 'openai' }]),
      });
      render(<SpanDetail {...props} />);
      expect(screen.getByRole('tab', { name: 'GenAI' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'false');
    });
  });
});
