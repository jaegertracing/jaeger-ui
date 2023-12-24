// Copyright (c) 2020 Uber Technologies, Inc.
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
import '@testing-library/jest-dom';

import ExamplesLink from './ExamplesLink';

describe('ExamplesLink', () => {
  const traceLinks = [
    {
      traceID: 'foo',
    },
    {
      traceID: 'bar',
    },
  ];

  const spanLinks = traceLinks.map(({ traceID }, i) => ({
    traceID: `${traceID}${i}`,
    spanIDs: new Array(i + 1).fill('spanID').map((str, j) => `${str}${i}${j}`),
  }));

  const expectedTraceParams = 'traceID=foo&traceID=bar';
  const expectedSpanParams = 'span=spanID00%40foo0&span=spanID10%20spanID11%40bar1';

  it('renders null when props.examples is absent', () => {
    render(<ExamplesLink />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders null when props.examples is empty', () => {
    render(<ExamplesLink examples={[]} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders correctly when given trace links', () => {
    render(<ExamplesLink examples={traceLinks} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/search?${expectedTraceParams}`);
  });

  it('renders as expected when given span links', () => {
    render(<ExamplesLink examples={spanLinks} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/search?${expectedSpanParams}`);
  });

  it('renders as expected when given both span and trace links', () => {
    render(<ExamplesLink examples={spanLinks.concat(traceLinks)} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/search?${expectedSpanParams}&${expectedTraceParams}`
    );
  });

  it('renders label text iff props.includeText is true', () => {
    render(<ExamplesLink examples={traceLinks} />);
    expect(screen.queryByText('Examples')).toBeNull();

    render(<ExamplesLink examples={traceLinks} includeText />);
    expect(screen.getByText('Examples')).toBeInTheDocument();
  });
});
