// Copyright (c) 2019 The Jaeger Authors.
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

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchedState } from '../../../constants';
import * as dateUtils from '../../../utils/date';
import CohortTable from './CohortTable';

describe('CohortTable', () => {
  const cohort = [
    {
      data: {
        traceName: 'trace name 0',
      },
      error: 'api error',
      id: 'trace-id-0',
      state: fetchedState.ERROR,
    },
    {
      id: 'trace-id-1',
    },
    {
      id: 'trace-id-2',
    },
  ];
  let selectTrace;
  let props;
  let formatDurationSpy;

  beforeAll(() => {
    formatDurationSpy = jest.spyOn(dateUtils, 'formatDuration');
  });

  beforeEach(() => {
    selectTrace = jest.fn();
    formatDurationSpy.mockReset();
    props = {
      cohort,
      current: cohort[0].id,
      selection: {
        [cohort[0].id]: {
          label: 'selected index 0',
        },
      },
      selectTrace,
    };
  });

  it('renders as expected', () => {
    render(<CohortTable {...props} />);
    expect(screen.getByText('Service & Operation')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Spans')).toBeInTheDocument();
  });

  describe('row selection', () => {
    it('defaults selectedRowKeys to empty array', () => {
      render(<CohortTable {...props} current={undefined} />);
      expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument();
      expect(screen.getByText('Service & Operation')).toBeInTheDocument();
    });

    it('calls props.selectTrace on row selection', async () => {
      render(<CohortTable {...props} />);
      const radioButtons = screen.getAllByRole('radio');
      await userEvent.click(radioButtons[1]);
      expect(selectTrace).toHaveBeenCalledWith(cohort[1].id);
    });

    it('disables radio button for selected and current record with error state', () => {
      const { container } = render(<CohortTable {...props} />);
      const radioButtons = container.querySelectorAll('input[type="radio"]');
      expect(radioButtons[0]).toBeDisabled();
      expect(screen.getByText('selected index 0')).toBeInTheDocument();
    });

    it('enables radio button for selected and current record without error state', () => {
      const { container } = render(
        <CohortTable {...props} cohort={[{ ...cohort[0], state: fetchedState.DONE }]} />
      );
      const radioButtons = container.querySelectorAll('input[type="radio"]');
      expect(radioButtons[0]).not.toBeDisabled();
      expect(screen.getByText('Service & Operation')).toBeInTheDocument();
    });

    it('disables radio button for selected but not current record', () => {
      const { container } = render(
        <CohortTable
          {...props}
          selection={{
            ...props.selection,
            [cohort[1].id]: {
              label: 'selected index 1',
            },
          }}
        />
      );
      const radioButtons = container.querySelectorAll('input[type="radio"]');
      expect(radioButtons[1]).toBeDisabled();
      expect(screen.getByText('selected index 1')).toBeInTheDocument();
    });

    it('enables radio button for non-selected record without error state', () => {
      const { container } = render(<CohortTable {...props} />);
      const radioButtons = container.querySelectorAll('input[type="radio"]');
      expect(radioButtons[1]).not.toBeDisabled();
      expect(screen.getByText('Service & Operation')).toBeInTheDocument();
    });
  });

  it('renders shortened id', () => {
    const traceID = 'trace-id-longer-than-eight-characters';
    render(<CohortTable {...props} cohort={[{ ...cohort[0], id: traceID }]} current={traceID} />);
    const idColumn = screen.getByText('trace-i');
    expect(idColumn).toBeInTheDocument();
  });

  it('renders TraceName fragment when given complete data', () => {
    render(<CohortTable {...props} />);
    expect(screen.getAllByTestId('traceName').some(el => el.textContent === 'api error')).toBe(true);
    expect(screen.getByText('selected index 0')).toBeInTheDocument();
  });

  it('renders TraceName fragment when given minimal data', () => {
    render(<CohortTable {...props} cohort={[cohort[1]]} current={cohort[1].id} selection={{}} />);
    expect(screen.getByTestId('traceName').textContent).toBe('<trace-without-root-span>');
    expect(screen.queryByText('trace name 0')).not.toBeInTheDocument();
  });

  it('renders date iff record state is fetchedState.DONE', () => {
    render(
      <CohortTable
        {...props}
        cohort={[
          { ...cohort[0], state: fetchedState.ERROR },
          { ...cohort[0], state: fetchedState.DONE, data: { ...cohort[0].data, startTime: 1548689901403 } },
        ]}
      />
    );
    expect(screen.getByText('Service & Operation')).toBeInTheDocument();
  });

  it('renders duration iff record state is fetchedState.DONE', () => {
    formatDurationSpy.mockReturnValue('formatDurationSpyMockReturnValue');
    render(
      <CohortTable
        {...props}
        cohort={[
          { ...cohort[0], state: fetchedState.ERROR },
          { ...cohort[0], state: fetchedState.DONE, data: { ...cohort[0].data, duration: 150 } },
        ]}
      />
    );
    expect(formatDurationSpy).toHaveBeenCalledWith(150);
  });

  it('renders link', () => {
    render(<CohortTable {...props} />);
    expect(screen.getAllByText(props.current.slice(0, 7)).length).toBeGreaterThan(0);
  });

  it('renders NEED_MORE_TRACES_MESSAGE if cohort is too small', () => {
    render(<CohortTable {...props} cohort={cohort.slice(0, 1)} />);
    expect(
      screen.getAllByText('Enter a Trace ID or perform a search and select from the results.').length
    ).toBeGreaterThan(0);
    render(<CohortTable {...props} cohort={[]} />);
    expect(
      screen.getAllByText('Enter a Trace ID or perform a search and select from the results.').length
    ).toBeGreaterThan(0);
  });
});
