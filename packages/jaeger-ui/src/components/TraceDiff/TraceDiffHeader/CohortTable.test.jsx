// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import CohortTable from './CohortTable';
import { fetchedState } from '../../../constants';
import * as dateUtils from '../../../utils/date';

jest.mock('./TraceTimelineLink', () => ({
  __esModule: true,
  default: props => <div data-testid="trace-timeline-link" data-trace-id={props.traceID} />,
}));

jest.mock('../../common/RelativeDate', () => ({
  __esModule: true,
  default: props => (
    <div
      data-testid="relative-date"
      data-value={props.value}
      data-full-month-name={props.fullMonthName}
      data-include-time={props.includeTime}
    />
  ),
}));

jest.mock('../../common/TraceName', () => ({
  __esModule: true,
  default: props => (
    <div
      data-testid="trace-name"
      data-error={props.error || ''}
      data-state={props.state || ''}
      data-trace-name={props.traceName || ''}
      className={props.className}
    />
  ),
}));

describe('CohortTable', () => {
  const cohort = [
    {
      data: {
        traceName: 'trace name 0',
        startTime: 1548689901403,
        duration: 150,
        spans: { length: 10 },
        traceID: 'trace-id-0',
      },
      error: 'api error',
      id: 'trace-id-0',
      state: fetchedState.ERROR,
    },
    {
      data: {
        traceName: 'trace name 1',
        startTime: 1548689901503,
        duration: 250,
        spans: { length: 15 },
        traceID: 'trace-id-1',
      },
      id: 'trace-id-1',
      state: fetchedState.DONE,
    },
    {
      data: {
        traceName: 'trace name 2',
        startTime: 1548689901603,
        duration: 350,
        spans: { length: 20 },
        traceID: 'trace-id-2',
      },
      id: 'trace-id-2',
      state: fetchedState.DONE,
    },
  ];
  const selectTrace = jest.fn();
  const defaultProps = {
    cohort,
    current: cohort[0].id,
    selection: {
      [cohort[0].id]: {
        label: 'selected index 0',
      },
    },
    selectTrace,
  };

  let formatDurationSpy;

  beforeAll(() => {
    formatDurationSpy = jest.spyOn(dateUtils, 'formatDuration');
    formatDurationSpy.mockImplementation(value => `${value}ms`);
  });

  beforeEach(() => {
    selectTrace.mockReset();
    formatDurationSpy.mockClear();
  });

  afterAll(() => {
    formatDurationSpy.mockRestore();
  });

  it('renders as expected', () => {
    const { container } = render(<CohortTable {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').length).toBe(7);
  });

  describe('row selection', () => {
    it('defaults selectedRowKeys to empty array', () => {
      render(<CohortTable {...defaultProps} current={undefined} />);
      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });

    it('calls props.selectTrace on row selection', () => {
      render(<CohortTable {...defaultProps} />);
      const radioButtons = screen.getAllByRole('radio');
      fireEvent.click(radioButtons[1]);
      expect(selectTrace).toHaveBeenCalledWith(cohort[1].id);
    });

    it('calculates checkbox props for selected and current record with error', () => {
      render(<CohortTable {...defaultProps} />);
      const radioButtons = screen.getAllByRole('radio');

      expect(radioButtons[0]).toBeDisabled();
    });

    it('calculates checkbox props for selected and current record without error', () => {
      const modifiedCohort = [...cohort];
      modifiedCohort[0] = { ...cohort[0], state: fetchedState.DONE };

      render(<CohortTable {...defaultProps} cohort={modifiedCohort} />);
      const radioButtons = screen.getAllByRole('radio');

      expect(radioButtons[0]).not.toBeDisabled();
    });

    it('calculates checkbox props for selected but not current record without error', () => {
      const propsWithExtraSelection = {
        ...defaultProps,
        selection: {
          ...defaultProps.selection,
          [cohort[1].id]: { label: 'selected index 1' },
        },
      };

      render(<CohortTable {...propsWithExtraSelection} />);
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons[1]).toBeDisabled();
    });

    it('calculates checkbox props for not selected record', () => {
      render(<CohortTable {...defaultProps} />);
      const radioButtons = screen.getAllByRole('radio');

      expect(radioButtons[2]).not.toBeDisabled();
    });
  });

  it('renders shortened id', () => {
    const longTraceId = 'trace-id-longer-than-eight-characters';
    const testCohort = [
      {
        id: longTraceId,
        data: {
          traceID: longTraceId,
          spans: { length: 5 },
        },
      },
    ];

    const { container } = render(<CohortTable {...defaultProps} cohort={testCohort} />);

    const idCell = within(container).queryByText(longTraceId.slice(0, 7));
    expect(idCell).toBeInTheDocument();
    expect(idCell.textContent).toBe(longTraceId.slice(0, 7));
  });

  it('renders TraceName fragment when given complete data', () => {
    const { container } = render(<CohortTable {...defaultProps} />);

    const traceNameElements = within(container).getAllByTestId('trace-name');
    expect(traceNameElements[0]).toHaveAttribute('data-error', 'api error');
    expect(traceNameElements[0]).toHaveAttribute('data-state', fetchedState.ERROR);
    expect(traceNameElements[0]).toHaveAttribute('data-trace-name', 'trace name 0');

    const label = within(container).getByText('selected index 0');
    expect(label).toBeInTheDocument();
  });

  it('renders TraceName fragment when given minimal data', () => {
    const minimalCohort = [
      {
        id: 'minimal-trace-id',
        data: {},
      },
    ];

    const { container } = render(<CohortTable {...defaultProps} cohort={minimalCohort} />);

    const traceNameElements = within(container).getAllByTestId('trace-name');
    expect(traceNameElements[0]).toHaveAttribute('data-error', '');
    expect(traceNameElements[0]).toHaveAttribute('data-trace-name', '');

    expect(within(container).queryByText('selected index 0')).not.toBeInTheDocument();
  });

  it('renders date iff record state is fetchedState.DONE', () => {
    const { container } = render(<CohortTable {...defaultProps} />);

    const relativeDateElements = within(container).getAllByTestId('relative-date');
    expect(relativeDateElements.length).toBe(2);

    expect(relativeDateElements[0]).toHaveAttribute(
      'data-value',
      (cohort[1].data.startTime / 1000).toString()
    );
    expect(relativeDateElements[0]).toHaveAttribute('data-full-month-name', 'true');
    expect(relativeDateElements[0]).toHaveAttribute('data-include-time', 'true');
  });

  it('renders duration iff record state is fetchedState.DONE', () => {
    formatDurationSpy.mockImplementation(value => `formatted-${value}`);
    const { container } = render(<CohortTable {...defaultProps} />);

    expect(formatDurationSpy).toHaveBeenCalledTimes(2);
    expect(formatDurationSpy).toHaveBeenCalledWith(cohort[1].data.duration);
    expect(formatDurationSpy).toHaveBeenCalledWith(cohort[2].data.duration);

    expect(within(container).getByText(`formatted-${cohort[1].data.duration}`)).toBeInTheDocument();
    expect(within(container).getByText(`formatted-${cohort[2].data.duration}`)).toBeInTheDocument();
  });

  it('renders link', () => {
    const { container } = render(<CohortTable {...defaultProps} />);

    const traceLinks = within(container).getAllByTestId('trace-timeline-link');
    expect(traceLinks.length).toBe(cohort.length);

    expect(traceLinks[0]).toHaveAttribute('data-trace-id', cohort[0].data.traceID);
    expect(traceLinks[1]).toHaveAttribute('data-trace-id', cohort[1].data.traceID);
    expect(traceLinks[2]).toHaveAttribute('data-trace-id', cohort[2].data.traceID);
  });

  it('renders NEED_MORE_TRACES_MESSAGE if cohort is too small', () => {
    const { container: container1 } = render(<CohortTable {...defaultProps} cohort={[cohort[0]]} />);
    const message1 = within(container1).getByText(/Enter a Trace ID or perform a search/);
    expect(message1).toBeInTheDocument();

    screen.debug();

    const { container: container2 } = render(<CohortTable {...defaultProps} cohort={[]} />);
    const message2 = within(container2).getByText(/Enter a Trace ID or perform a search/);
    expect(message2).toBeInTheDocument();

    const { container: container3 } = render(<CohortTable {...defaultProps} />);
    const message3 = within(container3).queryByText(/Enter a Trace ID or perform a search/);
    expect(message3).not.toBeInTheDocument();
  });
});
