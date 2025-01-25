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
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricCard from './MetricCard';

describe('MetricCard', () => {
  const metric = {
    name: 'Metric Name',
    description: 'Metric Description',
    metricDocumentationLink: 'metric.documentation.link',
    passCount: 108,
    passExamples: ['foo'],
    failureCount: 255,
    failureExamples: ['bar'],
    exemptionCount: 42,
    exemptionExamples: ['baz'],
  };
  const details = [
    {
      columns: ['col0', 'col1'],
      description: 'Details[0] Description',
    },
    {
      columns: ['col2', 'col3'],
      description: 'Details[1] Description',
      rows: [],
    },
    {
      columns: ['col4', 'col5'],
      description: 'Details[2] Description',
      rows: [
        {
          col4: 'value for fourth column',
          col5: 'value for fifth column',
        },
      ],
    },
    {
      columns: ['col6', 'col7'],
      description: 'Details[3] Description',
      header: 'Details[3] Header',
      rows: [
        {
          col6: 'value for sixth column',
          col7: 'value for seventh column',
        },
      ],
    },
  ];

  it('renders as expected without details', () => {
    const { container } = render(<MetricCard metric={metric} />);
    expect(screen.getByText('Metric Name')).toBeInTheDocument();
    expect(screen.getByText('Metric Description')).toBeInTheDocument();
    expect(container.querySelector('.MetricCard--Details')).not.toBeInTheDocument();
  });

  it('renders as expected with details', () => {
    render(<MetricCard metric={{ ...metric, details }} />);
    expect(screen.getByText(metric.name)).toBeInTheDocument();
    expect(screen.getByText(metric.description)).toBeInTheDocument();
    details.forEach(detail => {
      if (detail.rows && detail.rows.length) {
        expect(screen.getByText(detail.description)).toBeInTheDocument();
      }
    });
  });

  it('renders as expected when passCount is zero', () => {
    render(<MetricCard metric={{ ...metric, passCount: 0 }} />);
    expect(screen.getByText('Metric Name')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('Passing')).toBeInTheDocument();
  });
});
