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

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TraceDiffHeader from './TraceDiffHeader';
import { fetchedState } from '../../../constants';

describe('TraceDiffHeader', () => {
  const cohort = [
    {
      data: {
        duration: 0,
        // purposefully missing spans
        startTime: 0,
        traceName: 'cohort-trace-name-0',
      },
      error: 'error 0',
      id: 'cohort-id-0',
      state: fetchedState.ERROR,
    },
    {
      data: {
        duration: 100,
        spans: [
          {
            spanID: 'trace-1-span-0',
          },
        ],
        startTime: 100,
        traceName: 'cohort-trace-name-1',
      },
      error: 'error 1',
      id: 'cohort-id-1',
      state: fetchedState.DONE,
    },
    {
      data: {
        duration: 200,
        spans: [
          {
            spanID: 'trace-2-span-1',
          },
          {
            spanID: 'trace-2-span-2',
          },
        ],
        startTime: 200,
        traceName: 'cohort-trace-name-2',
      },
      error: 'error 2',
      id: 'cohort-id-2',
      state: fetchedState.DONE,
    },
    {
      data: {
        duration: 300,
        spans: [
          {
            spanID: 'trace-3-span-1',
          },
          {
            spanID: 'trace-3-span-2',
          },
          {
            spanID: 'trace-3-span-3',
          },
        ],
        startTime: 300,
        traceName: 'cohort-trace-name-3',
      },
      error: 'error 3',
      id: 'cohort-id-3',
      state: fetchedState.DONE,
    },
  ];
  let diffSetA;
  let diffSetB;
  let props;

  beforeEach(() => {
    diffSetA = jest.fn();
    diffSetB = jest.fn();
    props = {
      a: cohort[1],
      b: cohort[2],
      cohort,
      diffSetA,
      diffSetB,
    };
  });

  it('renders as expected', () => {
    render(<TraceDiffHeader {...props} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
    expect(
      screen.getAllByText((content, node) => {
        const hasText = n =>
          n.textContent && n.textContent.replace(/\s+/g, '').includes('cohort-trace-name-1');
        const nodeHasText = hasText(node);
        const childrenDontHaveText = Array.from(node?.children || []).every(childNode => !hasText(childNode));
        return nodeHasText && childrenDontHaveText;
      }).length
    ).toBeGreaterThan(0);
  });

  it('handles trace without spans', () => {
    render(<TraceDiffHeader {...props} a={cohort[0]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('handles absent a', () => {
    render(<TraceDiffHeader {...props} a={null} />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('handles absent b', () => {
    render(<TraceDiffHeader {...props} b={null} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('handles absent a & b', () => {
    render(<TraceDiffHeader {...props} a={null} b={null} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('manages visibility correctly', async () => {
    render(<TraceDiffHeader {...props} />);
    const chevrons = screen.getAllByTestId('TraceDiffHeader--traceTitleChevron');
    expect(chevrons.length).toBeGreaterThanOrEqual(2);
    await userEvent.click(chevrons[0]);
    expect((await screen.findAllByText('Service & Operation')).length).toBeGreaterThan(0);
    await userEvent.click(chevrons[1]);
    expect((await screen.findAllByText('Service & Operation')).length).toBeGreaterThan(0);
    await userEvent.click(chevrons[1]);
  });

  describe('bound functions to set a & b and passes them to Popover JSX props correctly', () => {
    it('calls diffSetA and diffSetB correctly', () => {
      render(<TraceDiffHeader {...props} />);

      props.diffSetA('test-trace-a');
      expect(diffSetA).toHaveBeenCalledWith('test-trace-a');
      props.diffSetB('test-trace-b');
      expect(diffSetB).toHaveBeenCalledWith('test-trace-b');
    });
  });
});
