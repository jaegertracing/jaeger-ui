// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
