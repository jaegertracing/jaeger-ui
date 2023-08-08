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
import { render } from '@testing-library/react';
import ScoreCard from './ScoreCard';

describe('ScoreCard', () => {
  const link = 'test.link';
  const label = 'Test Score';
  const value = 42;
  const max = 108;

  it('renders as expected when score is below max', () => {
    const { container } = render(
      <ScoreCard
        link={link}
        score={{
          label,
          max,
          value,
        }}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders as expected when score is max', () => {
    const { container } = render(
      <ScoreCard
        link={link}
        score={{
          label,
          max,
          value: max,
        }}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders as expected when score is zero', () => {
    const { container } = render(
      <ScoreCard
        link={link}
        score={{
          label,
          max,
          value: 0,
        }}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
