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
import ScoreCard from './ScoreCard';

describe('ScoreCard', () => {
  const link = 'test.link';
  const label = 'Test Score';
  const max = 108;

  const renderScoreCard = value => {
    render(
      <ScoreCard
        link={link}
        score={{
          label,
          max,
          value,
        }}
      />
    );
  };

  it('renders correctly when score is below max', () => {
    const value = 42;
    renderScoreCard(value);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('How to improve')).toBeInTheDocument();
    expect(screen.getByText(/38.9%/)).toBeInTheDocument(); // (42/108)*100
    expect(screen.getByRole('link')).toHaveAttribute('href', link);
  });

  it('renders correctly when score is max', () => {
    renderScoreCard(max);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('Great! What does this mean')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', link);
  });

  it('renders correctly when score is zero', () => {
    renderScoreCard(0);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('How to improve')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', link);
  });
});
