// Copyright (c) 2017 Uber Technologies, Inc.
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

jest.mock('../utils');

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import DetailState from './DetailState';
import SpanDetail from './index';
import { formatDuration } from '../utils';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';

jest.mock('./AccordianKeyValues', () => {
  return function MockAccordianKeyValues({ label, onToggle }) {
    return (
      <div data-testid={`accordian-keyvalues-${label.toLowerCase()}`}>
        <button type="button" onClick={onToggle} data-testid={`toggle-${label.toLowerCase()}`}>
          Toggle {label}
        </button>
      </div>
    );
  };
});

jest.mock('./AccordianLogs', () => {
  return function MockAccordianLogs({ onToggle, onItemToggle }) {
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

jest.mock('./AccordianReferences', () => {
  return function MockAccordianReferences({ onToggle }) {
    return (
      <div data-testid="accordian-references">
        <button type="button" onClick={onToggle} data-testid="toggle-references">
          Toggle References
        </button>
      </div>
    );
  };
});

jest.mock('./AccordianText', () => {
  return function MockAccordianText({ onToggle }) {
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
  let span;
  let detailState;

  beforeEach(() => {
    formatDuration.mockReset();
    formatDuration.mockImplementation(duration => `${duration}ms`);

    span = transformTraceData(traceGenerator.trace({ numberOfSpans: 1 })).spans[0];
    detailState = new DetailState().toggleLogs().toggleProcess().toggleReferences().toggleTags();
    const traceStartTime = 5;

    props = {
      detailState,
      span,
      traceStartTime,
      currentViewRangeTime: [0, 100],
      traceDuration: 1000,
      logItemToggle: jest.fn(),
      logsToggle: jest.fn(),
      processToggle: jest.fn(),
      tagsToggle: jest.fn(),
      warningsToggle: jest.fn(),
      referencesToggle: jest.fn(),
      focusSpan: jest.fn(),
      linksGetter: jest.fn(),
    };

    span.logs = [
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

    span.warnings = ['Warning 1', 'Warning 2'];

    span.references = [
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
  });

  it('renders the component successfully without errors', () => {
    render(<SpanDetail {...props} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('displays the span operation name as the main heading', () => {
    render(<SpanDetail {...props} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(span.operationName);
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

    expect(props.tagsToggle).toHaveBeenCalledWith(span.spanID);
  });

  it('renders process tags accordian and triggers toggle callback with span ID', () => {
    render(<SpanDetail {...props} />);

    const processAccordian = screen.getByTestId('accordian-keyvalues-process');
    expect(processAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-process');
    fireEvent.click(toggleButton);

    expect(props.processToggle).toHaveBeenCalledWith(span.spanID);
  });

  it('renders logs accordian and triggers both main toggle and item toggle callbacks', () => {
    render(<SpanDetail {...props} />);

    const logsAccordian = screen.getByTestId('accordian-logs');
    expect(logsAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-logs');
    fireEvent.click(toggleButton);
    expect(props.logsToggle).toHaveBeenCalledWith(span.spanID);

    const logItemButton = screen.getByTestId('toggle-log-item');
    fireEvent.click(logItemButton);
    expect(props.logItemToggle).toHaveBeenCalledWith(span.spanID, 'test-log');
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

    const referencesAccordian = screen.getByTestId('accordian-references');
    expect(referencesAccordian).toBeInTheDocument();

    const toggleButton = screen.getByTestId('toggle-references');
    fireEvent.click(toggleButton);

    expect(props.referencesToggle).toHaveBeenCalledWith(span.spanID);
  });

  it('renders copy icon with deep link URL containing the span ID parameter', () => {
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://example.com',
        pathname: '/trace/test',
      },
      writable: true,
    });

    render(<SpanDetail {...props} />);

    const copyIcon = screen.getByTestId('copy-icon');
    const copyText = copyIcon.getAttribute('data-copy-text');

    expect(copyIcon).toBeInTheDocument();
    expect(copyText).toContain(`?uiFind=${props.span.spanID}`);
  });
});
