// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BannerText from './BannerText';

describe('BannerText', () => {
  it('renders null when props.bannerText is falsy', () => {
    const { container } = render(<BannerText />);
    expect(container.firstChild).toBe(null);
  });

  it('renders header when props.bannerText is a string', () => {
    render(<BannerText bannerText="foo text" />);
    expect(screen.getByText('foo text')).toBeInTheDocument();
  });

  it('renders styled header when props.bannerText is a styled value', () => {
    render(
      <BannerText
        bannerText={{
          styling: {
            background: 'red',
            color: 'rgb(255, 255, 255)',
          },
          value: 'foo text',
        }}
      />
    );

    expect(screen.getByText('foo text')).toBeInTheDocument();
    expect(screen.getByText('foo text')).toHaveStyle('background: red; color: rgb(255, 255, 255);');
  });
});
