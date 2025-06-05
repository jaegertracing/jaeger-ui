// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Checkbox } from 'antd';
import { IoLocate } from 'react-icons/io5';
import NewWindowIcon from '../NewWindowIcon';
import ActionsMenu from './ActionsMenu';

describe('<ActionsMenu>', () => {
  const mockOnClick = jest.fn();
  const mockHref = 'http://example.com';
  const mockIcon = <IoLocate />;
  const mockNewWindowIcon = <NewWindowIcon />;

  const defaultProps = {
    items: [
      {
        id: 'action1',
        label: 'Action 1',
        icon: mockIcon,
        onClick: mockOnClick,
        isVisible: true,
      },
      {
        id: 'action2',
        label: 'Action 2',
        icon: mockNewWindowIcon,
        href: mockHref,
        isVisible: true,
      },
      {
        id: 'action3',
        label: 'Action 3',
        icon: null,
        onClick: mockOnClick,
        isVisible: true,
        checkboxProps: {
          checked: true,
          indeterminate: false,
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ActionsMenu {...defaultProps} />);
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
    expect(screen.getByText('Action 3')).toBeInTheDocument();
  });

  it('does not render hidden menu items', () => {
    const itemsWithHidden = [
      ...defaultProps.items,
      {
        id: 'hidden',
        label: 'Hidden Action',
        icon: mockIcon,
        onClick: mockOnClick,
        isVisible: false,
      },
    ];
    render(<ActionsMenu items={itemsWithHidden} />);
    expect(screen.queryByText('Hidden Action')).not.toBeInTheDocument();
  });

  it('renders menu item with icon', () => {
    render(<ActionsMenu {...defaultProps} />);
    expect(screen.getAllByRole('link')[0].querySelector('svg')).toBeInTheDocument();
  });

  it('renders menu item with href', () => {
    render(<ActionsMenu {...defaultProps} />);
    const link = screen.getByText('Action 2').closest('a');
    expect(link).toHaveAttribute('href', mockHref);
  });

  it('renders menu item with checkbox', () => {
    render(<ActionsMenu {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('calls onClick when menu item is clicked', () => {
    render(<ActionsMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Action 1'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('handles item without icon but with checkbox', () => {
    render(<ActionsMenu {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<ActionsMenu {...defaultProps} className="custom-class" />);
    expect(document.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ActionsMenu {...defaultProps} />);
    const items = screen.getAllByRole('link');
    items.forEach(item => {
      expect(item).toHaveAttribute('tabindex', '0');
    });

    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toHaveAttribute('tabindex', '0');
    });
  });

  describe('keyboard navigation', () => {
    it('calls onClick on Enter key', () => {
      render(<ActionsMenu {...defaultProps} />);
      fireEvent.keyDown(screen.getByText('Action 1'), { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Space key', () => {
      render(<ActionsMenu {...defaultProps} />);
      fireEvent.keyDown(screen.getByText('Action 1'), { key: ' ' });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('ignores other keys', () => {
      render(<ActionsMenu {...defaultProps} />);
      fireEvent.keyDown(screen.getByText('Action 1'), { key: 'Tab' });
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  it('handles empty items array', () => {
    render(<ActionsMenu items={[]} />);
    expect(screen.queryAllByRole('link').length).toBe(0);
  });

  it('handles undefined items', () => {
    render(<ActionsMenu />);
    expect(screen.queryAllByRole('link').length).toBe(0);
  });
});
