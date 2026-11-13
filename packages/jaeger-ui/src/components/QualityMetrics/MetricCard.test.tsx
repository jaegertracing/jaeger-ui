// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';

import MetricCard from './MetricCard';
import type { TQualityMetrics } from './types';

type TMetric = TQualityMetrics['metrics'][0];
type TDetails = NonNullable<TMetric['details']>;

describe('MetricCard', () => {
  const metric: TMetric = {
    name: 'Metric Name',
    category: 'Metric Category',
    description: 'Metric Description',
    metricDocumentationLink: 'metric.documentation.link',
    metricWeight: 1,
    passCount: 108,
    passExamples: [{ traceID: 'foo' }],
    failureCount: 255,
    failureExamples: [{ traceID: 'bar' }],
    exemptionCount: 42,
    exemptionExamples: [{ traceID: 'baz' }],
  };
  const details: TDetails = [
    {
      columns: [{ key: 'col0' }, { key: 'col1' }],
      description: 'Details[0] Description',
      rows: [],
    },
    {
      columns: [{ key: 'col2' }, { key: 'col3' }],
      description: 'Details[1] Description',
      rows: [],
    },
    {
      columns: [{ key: 'col4' }, { key: 'col5' }],
      description: 'Details[2] Description',
      rows: [
        {
          col4: 'value for fourth column',
          col5: 'value for fifth column',
        },
      ],
    },
    {
      columns: [{ key: 'col6' }, { key: 'col7' }],
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
        expect(screen.getByText(detail.description!)).toBeInTheDocument();
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
