// Copyright (c) 2021 The Jaeger Authors.
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
import OperationsGraph from './opsGraph';
import { serviceOpsMetrics } from '../../../../reducers/metrics.mock';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('<OperationsGraph>', () => {
  const defaultProps = {
    color: '#FFFFFF',
    dataPoints: [],
    error: null,
  };

  it('does not explode', () => {
    const { container } = render(<OperationsGraph {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('"No Data" is displayed', () => {
    render(<OperationsGraph {...defaultProps} />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.queryByTestId('.ops-container')).not.toBeInTheDocument();
  });

  it('"Couldn\'t fetch data" displayed', () => {
    render(<OperationsGraph {...defaultProps} error={new Error('API Error')} />);
    expect(screen.getByText("Couldn't fetch data")).toBeInTheDocument();
    expect(screen.queryByTestId('.ops-container')).not.toBeInTheDocument();
  });

  it('Graph rendered successfully', () => {
    const props = {
      ...defaultProps,
      dataPoints: serviceOpsMetrics[0].dataPoints.service_operation_call_rate,
    };
    const { container } = render(<OperationsGraph {...props} />);
    expect(container.querySelector('.ops-container')).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
    expect(container.querySelector('.recharts-area')).toBeInTheDocument();
  });

  it('renders graph with custom yDomain', () => {
    const props = {
      ...defaultProps,
      dataPoints: [{ x: 1, y: 50 }],
      yDomain: [0, 100],
    };
    const { container } = render(<OperationsGraph {...props} />);
    expect(container.querySelector('.ops-container')).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });

  it('calculates yDomain from data points when not provided', () => {
    const props = {
      ...defaultProps,
      dataPoints: [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: null },
        { x: 4, y: 30 },
      ],
    };
    const { container } = render(<OperationsGraph {...props} />);
    expect(container.querySelector('.ops-container')).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });

  it('handles empty yValues array when calculating domain', () => {
    const props = {
      ...defaultProps,
      dataPoints: [
        { x: 1, y: null },
        { x: 2, y: null },
      ],
    };
    const { container } = render(<OperationsGraph {...props} />);
    expect(container.querySelector('.ops-container')).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });

  it('handles various y-value types when calculating domain', () => {
    const dataPoints = [
      { x: 1, y: 10 },
      { x: 2, y: null },
      { x: 3, y: undefined },
      { x: 4, y: 30 },
    ];
    const { container } = render(<OperationsGraph dataPoints={dataPoints} />);
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });

  it('generates placeholder with custom text', () => {
    const customText = 'Custom Placeholder';
    const placeholder = OperationsGraph.generatePlaceholder(customText);
    render(placeholder);
    const placeholderElement = screen.getByText(customText);
    expect(placeholderElement).toBeInTheDocument();
    expect(placeholderElement).toHaveClass('ops-graph-placeholder');
  });
});
