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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import AccordianLogs from './AccordianLogs';

const mockAccordianKeyValues = jest.fn();
jest.mock('./AccordianKeyValues', () => props => {
  mockAccordianKeyValues(props);
  return (
    <div data-testid="log-item" onClick={props.onToggle}>
      LogItem
    </div>
  );
});

describe('<AccordianLogs>', () => {
  const logs = [
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

  const defaultInRangeLogs = [logs[0]];
  const defaultInRangeLogsCount = defaultInRangeLogs.length;
  const defaultTotalCount = logs.length;
  const defaultProps = {
    logs,
    isOpen: false,
    onItemToggle: jest.fn(),
    onToggle: jest.fn(),
    openedItems: new Set([logs[1]]),
    timestamp: 5,
    traceDuration: 100,
    currentViewRangeTime: [0.0, 0.12],
    interactive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AccordianLogs {...defaultProps} />);
    const header = screen.getByRole('switch');
    expect(header).toHaveTextContent(`Logs (${defaultInRangeLogsCount} of ${defaultTotalCount})`);
    expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
  });

  it('hides log items when not expanded', () => {
    render(<AccordianLogs {...defaultProps} />);
    expect(screen.queryByTestId('log-item')).not.toBeInTheDocument();
  });

  it('shows log items when expanded', () => {
    render(<AccordianLogs {...defaultProps} isOpen />);
    const items = screen.getAllByTestId('log-item');
    expect(items.length).toBe(defaultInRangeLogsCount);
  });

  it('calls onItemToggle when a log item is toggled', () => {
    render(<AccordianLogs {...defaultProps} isOpen />);
    const items = screen.getAllByTestId('log-item');

    items.forEach((item, index) => {
      fireEvent.click(item);
      expect(defaultProps.onItemToggle).toHaveBeenCalledWith(defaultInRangeLogs[index]);
    });
  });

  it('propagates isOpen to log items correctly', () => {
    render(<AccordianLogs {...defaultProps} isOpen />);
    expect(mockAccordianKeyValues).toHaveBeenCalledTimes(defaultInRangeLogsCount);
    expect(mockAccordianKeyValues.mock.calls[0][0].isOpen).toBe(
      defaultProps.openedItems.has(defaultInRangeLogs[0])
    );
  });

  it('calls onToggle when the header is clicked', () => {
    render(<AccordianLogs {...defaultProps} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('shows all logs when "show all" is clicked', () => {
    render(<AccordianLogs {...defaultProps} isOpen />);
    fireEvent.click(screen.getByRole('button', { name: /show all/i }));
    expect(screen.getByRole('switch')).toHaveTextContent(`Logs (${defaultTotalCount})`);
    const items = screen.getAllByTestId('log-item');
    expect(items.length).toBe(defaultTotalCount);
    expect(screen.getByRole('button', { name: /show in range/i })).toBeInTheDocument();
  });

  it('displays in-range logs again when "show in range" is clicked', () => {
    render(<AccordianLogs {...defaultProps} isOpen />);
    fireEvent.click(screen.getByRole('button', { name: /show all/i }));
    fireEvent.click(screen.getByRole('button', { name: /show in range/i }));
    expect(screen.getByRole('switch')).toHaveTextContent(
      `Logs (${defaultInRangeLogsCount} of ${defaultTotalCount})`
    );
    const items = screen.getAllByTestId('log-item');
    expect(items.length).toBe(defaultInRangeLogsCount);
    expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
  });

  it('is interactive by default', () => {
    const { interactive, ...propsWithoutInteractive } = defaultProps;
    render(<AccordianLogs {...propsWithoutInteractive} isOpen />);

    const header = screen.getByRole('switch');
    expect(header).toBeInTheDocument();
    fireEvent.click(header);
    expect(propsWithoutInteractive.onToggle).toHaveBeenCalledTimes(1);
    expect(mockAccordianKeyValues).toHaveBeenCalledTimes(defaultInRangeLogsCount);

    mockAccordianKeyValues.mock.calls.forEach(callArgs => {
      const childProps = callArgs[0];
      expect(childProps.interactive).toBe(true);
      expect(childProps.onToggle).toBeInstanceOf(Function);
    });
  });
});
