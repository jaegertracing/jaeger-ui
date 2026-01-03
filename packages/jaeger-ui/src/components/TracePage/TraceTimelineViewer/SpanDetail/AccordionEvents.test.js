// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import AccordionEvents from './AccordionEvents';

const mockAccordionAttributes = jest.fn();
jest.mock('./AccordionAttributes', () => props => {
  mockAccordionAttributes(props);
  return (
    <div data-testid="event-item" onClick={props.onToggle}>
      LogItem
    </div>
  );
});

describe('<AccordionEvents>', () => {
  const events = [
    {
      timeUnixMicro: 10,
      name: 'event',
      attributes: [
        { key: 'message', value: 'oh the event message' },
        { key: 'something', value: 'else' },
      ],
    },
    {
      timeUnixMicro: 20,
      name: 'event',
      attributes: [
        { key: 'message', value: 'oh the next event message' },
        { key: 'more', value: 'stuff' },
      ],
    },
  ];

  const defaultInRangeLogs = [events[0]];
  const defaultInRangeLogsCount = defaultInRangeLogs.length;
  const defaultTotalCount = events.length;
  const defaultProps = {
    events,
    isOpen: false,
    onItemToggle: jest.fn(),
    onToggle: jest.fn(),
    openedItems: new Set([events[1]]),
    timestamp: 5,
    traceDuration: 100,
    currentViewRangeTime: [0.0, 0.12],
    interactive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AccordionEvents {...defaultProps} />);
    const header = screen.getByRole('switch');
    expect(header).toHaveTextContent(`Logs (${defaultInRangeLogsCount} of ${defaultTotalCount})`);
    expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
  });

  it('hides event items when not expanded', () => {
    render(<AccordionEvents {...defaultProps} />);
    expect(screen.queryByTestId('event-item')).not.toBeInTheDocument();
  });

  it('shows event items when expanded', () => {
    render(<AccordionEvents {...defaultProps} isOpen />);
    const items = screen.getAllByTestId('event-item');
    expect(items.length).toBe(defaultInRangeLogsCount);
  });

  it('calls onItemToggle when a event item is toggled', () => {
    render(<AccordionEvents {...defaultProps} isOpen />);
    const items = screen.getAllByTestId('event-item');

    items.forEach((item, index) => {
      fireEvent.click(item);
      expect(defaultProps.onItemToggle).toHaveBeenCalledWith(defaultInRangeLogs[index]);
    });
  });

  it('propagates isOpen to event items correctly', () => {
    render(<AccordionEvents {...defaultProps} isOpen />);
    expect(mockAccordionAttributes).toHaveBeenCalledTimes(defaultInRangeLogsCount);
    expect(mockAccordionAttributes.mock.calls[0][0].isOpen).toBe(
      defaultProps.openedItems.has(defaultInRangeLogs[0])
    );
  });

  it('calls onToggle when the header is clicked', () => {
    render(<AccordionEvents {...defaultProps} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('shows all events when "show all" is clicked', () => {
    render(<AccordionEvents {...defaultProps} isOpen />);
    fireEvent.click(screen.getByRole('button', { name: /show all/i }));
    expect(screen.getByRole('switch')).toHaveTextContent(`Logs (${defaultTotalCount})`);
    const items = screen.getAllByTestId('event-item');
    expect(items.length).toBe(defaultTotalCount);
    expect(screen.getByRole('button', { name: /show in range/i })).toBeInTheDocument();
  });

  it('displays in-range events again when "show in range" is clicked', () => {
    render(<AccordionEvents {...defaultProps} isOpen />);
    fireEvent.click(screen.getByRole('button', { name: /show all/i }));
    fireEvent.click(screen.getByRole('button', { name: /show in range/i }));
    expect(screen.getByRole('switch')).toHaveTextContent(
      `Logs (${defaultInRangeLogsCount} of ${defaultTotalCount})`
    );
    const items = screen.getAllByTestId('event-item');
    expect(items.length).toBe(defaultInRangeLogsCount);
    expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
  });

  it('is interactive by default', () => {
    const { interactive, ...propsWithoutInteractive } = defaultProps;
    render(<AccordionEvents {...propsWithoutInteractive} isOpen />);

    const header = screen.getByRole('switch');
    expect(header).toBeInTheDocument();
    fireEvent.click(header);
    expect(propsWithoutInteractive.onToggle).toHaveBeenCalledTimes(1);
    expect(mockAccordionAttributes).toHaveBeenCalledTimes(defaultInRangeLogsCount);

    mockAccordionAttributes.mock.calls.forEach(callArgs => {
      const childProps = callArgs[0];
      expect(childProps.interactive).toBe(true);
      expect(childProps.onToggle).toBeInstanceOf(Function);
    });
  });

  it('dispatches events and handles show more/less functionality', () => {
    jest.useFakeTimers();
    const originalDispatchEvent = window.dispatchEvent;
    const mockDispatchEvent = jest.fn();
    window.dispatchEvent = mockDispatchEvent;

    const manyLogs = Array.from({ length: 5 }, (_, i) => ({
      timeUnixMicro: 10 + i,
      name: 'event',
      attributes: [{ key: 'message', value: `event ${i}` }],
    }));

    const propsWithManyLogs = {
      ...defaultProps,
      events: manyLogs,
      currentViewRangeTime: [0.0, 1.0],
      initialVisibleCount: 3,
      spanID: 'test-span-123',
    };

    const { unmount } = render(<AccordionEvents {...propsWithManyLogs} isOpen />);
    const showMoreButton = screen.getByRole('button', { name: /show more.../i });
    fireEvent.click(showMoreButton);
    jest.runAllTimers();

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'jaeger:detail-measure',
        detail: { spanID: 'test-span-123' },
      })
    );

    const showLessButton = screen.getByRole('button', { name: /show less/i });
    fireEvent.click(showLessButton);

    unmount();

    mockDispatchEvent.mockClear();
    const propsWithoutSpanID = { ...propsWithManyLogs, spanID: undefined };
    render(<AccordionEvents {...propsWithoutSpanID} isOpen />);
    const showMoreButton2 = screen.getByRole('button', { name: /show more.../i });
    fireEvent.click(showMoreButton2);

    jest.runAllTimers();

    expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'jaeger:list-resize' }));

    window.dispatchEvent = originalDispatchEvent;
    jest.useRealTimers();
  });

  it('handles observer cleanup and errors', () => {
    const originalResizeObserver = window.ResizeObserver;
    const originalMutationObserver = window.MutationObserver;
    const mockResizeObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(() => {
        throw new Error('disconnect error');
      }),
    };
    window.ResizeObserver = jest.fn(() => mockResizeObserver);

    const { unmount: unmount1 } = render(<AccordionEvents {...defaultProps} isOpen />);
    expect(mockResizeObserver.observe).toHaveBeenCalled();
    expect(() => unmount1()).not.toThrow();

    window.ResizeObserver = undefined;
    const mockMutationObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(() => {
        throw new Error('mutation disconnect error');
      }),
    };
    window.MutationObserver = jest.fn(() => mockMutationObserver);

    const { unmount: unmount2 } = render(<AccordionEvents {...defaultProps} isOpen />);
    expect(() => unmount2()).not.toThrow();

    window.ResizeObserver = originalResizeObserver;
    window.MutationObserver = originalMutationObserver;
  });
});

describe('<AccordionEvents> OTEL specifics', () => {
  const events = [
    {
      timeUnixMicro: 10,
      name: 'otel-event-name',
      attributes: [],
    },
  ];

  const defaultProps = {
    events,
    isOpen: true,
    onItemToggle: jest.fn(),
    onToggle: jest.fn(),
    timestamp: 0,
    traceDuration: 100,
    currentViewRangeTime: [0.0, 1.0],
    interactive: true,
    useOtelTerms: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes event name in label when useOtelTerms is true', () => {
    render(<AccordionEvents {...defaultProps} />);
    expect(mockAccordionAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        label: expect.stringContaining('otel-event-name'),
      })
    );
  });

  it('passes correct props for events with no attributes', () => {
    render(<AccordionEvents {...defaultProps} />);
    expect(mockAccordionAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [],
        interactive: true,
      })
    );
  });
});
