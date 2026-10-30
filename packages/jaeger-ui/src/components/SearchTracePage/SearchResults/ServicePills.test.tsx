// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vite-plus/test';
import colorGenerator from '../../../utils/color-generator';
import ServicePills, { ServicePill, type ServiceEntry } from './ServicePills';

describe('ServicePills', () => {
  beforeEach(() => {
    colorGenerator.clear();
  });

  it('renders services sorted alphabetically by name', () => {
    const services: ServiceEntry[] = [
      { name: 'service-z', spanCount: 2 },
      { name: 'service-a', spanCount: 5 },
      { name: 'service-m', spanCount: 1 },
    ];

    render(<ServicePills services={services} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveTextContent('service-a (5)');
    expect(listItems[1]).toHaveTextContent('service-m (1)');
    expect(listItems[2]).toHaveTextContent('service-z (2)');
  });

  it('renders an empty list when given an empty services array', () => {
    render(<ServicePills services={[]} />);

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

describe('ServicePill', () => {
  beforeEach(() => {
    colorGenerator.clear();
  });

  it('renders service name and formatted span count when spanCount is provided', () => {
    const service: ServiceEntry = { name: 'order-service', spanCount: 42 };

    render(<ServicePill service={service} />);

    expect(screen.getByText(/order-service/)).toBeInTheDocument();
    expect(screen.getByText(/\(42\)/)).toBeInTheDocument();
  });

  it('renders service name without span count when spanCount is undefined', () => {
    const service: ServiceEntry = { name: 'auth-service' };

    render(<ServicePill service={service} />);

    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
  });

  it('renders the error alert icon when errorSpanCount is greater than 0', () => {
    const service: ServiceEntry = { name: 'payment-service', errorSpanCount: 3 };

    const { container } = render(<ServicePill service={service} />);

    const errorIcon = container.querySelector('.ServicePills--errorIcon');
    expect(errorIcon).toBeInTheDocument();
  });

  it('does not render the error alert icon when errorSpanCount is 0 or undefined', () => {
    const { container, rerender } = render(
      <ServicePill service={{ name: 'payment-service', errorSpanCount: 0 }} />
    );
    expect(container.querySelector('.ServicePills--errorIcon')).not.toBeInTheDocument();

    rerender(<ServicePill service={{ name: 'payment-service' }} />);
    expect(container.querySelector('.ServicePills--errorIcon')).not.toBeInTheDocument();
  });

  it('applies the border color corresponding to the service name from colorGenerator', () => {
    const service: ServiceEntry = { name: 'analytics-service' };
    const expectedColor = colorGenerator.getColorByKey('analytics-service');

    const { container } = render(<ServicePill service={service} />);

    const tag = container.querySelector('.ServicePills--tag');
    expect(tag).toHaveStyle({ borderLeftColor: expectedColor });
  });
});
