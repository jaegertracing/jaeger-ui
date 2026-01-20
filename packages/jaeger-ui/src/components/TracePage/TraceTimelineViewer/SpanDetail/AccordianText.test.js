// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import AccordianText from './AccordianText';

const warnings = ['Duplicated tag', 'Duplicated spanId'];

describe('<AccordianText>', () => {
  const baseProps = {
    data: warnings,
    isOpen: false,
    label: 'le-label',
  };

  it('renders without crashing', () => {
    render(<AccordianText {...baseProps} />);
    expect(screen.getByText(/le-label/i)).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<AccordianText {...baseProps} />);
    expect(screen.getByText('le-label')).toBeInTheDocument();
  });

  it('renders the content when it is expanded', () => {
    render(<AccordianText {...baseProps} isOpen />);
    expect(screen.getByText('Duplicated tag')).toBeInTheDocument();
    expect(screen.getByText('Duplicated spanId')).toBeInTheDocument();
  });

  it('disables onClick if data is empty', () => {
    const mockToggle = jest.fn();
    render(<AccordianText {...baseProps} data={[]} onToggle={mockToggle} />);
    const header = screen.getByRole('switch');
    fireEvent.click(header);
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it('has role="switch" when interactive is true', () => {
    render(<AccordianText {...baseProps} isOpen />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('has class "is-empty" if data is empty', () => {
    const { container } = render(<AccordianText {...baseProps} data={[]} />);
    const header = container.querySelector('.AccordianText--header');
    expect(header).toHaveClass('is-empty');
  });

  it('has class "is-high-contrast" if highContrast is true', () => {
    const { container } = render(<AccordianText {...baseProps} highContrast />);
    const header = container.querySelector('.AccordianText--header');
    expect(header).toHaveClass('is-high-contrast');
  });

  it('does not render icon or make header interactive when interactive is false', () => {
    const { container } = render(<AccordianText {...baseProps} interactive={false} />);
    const header = container.querySelector('.AccordianText--header');
    expect(header.getAttribute('role')).toBeNull();
    expect(header.querySelector('.u-align-icon')).not.toBeInTheDocument();
  });
});
