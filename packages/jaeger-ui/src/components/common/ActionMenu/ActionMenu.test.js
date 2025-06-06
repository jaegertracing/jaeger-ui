// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { IoLocate } from 'react-icons/io5';
import NewWindowIcon from '../NewWindowIcon';
import ActionsMenu from './ActionsMenu';

describe('<ActionsMenu>', () => {
  const mockOnClick = jest.fn();
  const mockHref = 'http://example.com';
  const mockIcon = <IoLocate data-testid="mock-icon" />;
  const mockNewWindowIcon = <NewWindowIcon data-testid="mock-window-icon" />;

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
  });

  it('renders all visible menu items', () => {
    render(<ActionsMenu {...defaultProps} />);
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
    expect(screen.getByText('Action 3')).toBeInTheDocument();
  });

  it('does not render hidden menu items', () => {
    render(
      <ActionsMenu
        items={[
          ...defaultProps.items,
          {
            id: 'hidden',
            label: 'Hidden Action',
            icon: mockIcon,
            onClick: mockOnClick,
            isVisible: false,
          },
        ]}
      />
    );
    expect(screen.queryByText('Hidden Action')).not.toBeInTheDocument();
  });

  it('renders menu items with icons', () => {
    render(<ActionsMenu {...defaultProps} />);
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(document.querySelector('.NewWindowIcon')).toBeInTheDocument();
  });

  it('renders menu items with links', () => {
    render(<ActionsMenu {...defaultProps} />);
    const linkItem = screen.getByText('Action 2').closest('a');
    expect(linkItem).toHaveAttribute('href', mockHref);
  });

  it('renders menu items with checkboxes', () => {
    render(<ActionsMenu {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox.indeterminate).toBe(false);
  });

  it('calls onClick handler when clicking a menu item', async () => {
    render(<ActionsMenu {...defaultProps} />);
    const firstItem = screen.getByText('Action 1');
    await userEvent.click(firstItem);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('handles menu items without icons', () => {
    render(<ActionsMenu {...defaultProps} />);
    expect(screen.getByText('Action 3')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-class';
    const { container } = render(<ActionsMenu {...defaultProps} className={customClass} />);
    expect(container.querySelector(`.${customClass}`)).toBeInTheDocument();
  });

  it('renders menu items with proper accessibility attributes', () => {
    render(<ActionsMenu {...defaultProps} />);
    const items = screen.getAllByText(/Action [1-3]/);
    items.forEach(item => {
      const parent = item.closest('a');
      expect(parent).toHaveAttribute('tabindex', '0');
    });
  });

  describe('keyboard navigation', () => {
    it('handles Enter key press', () => {
      render(<ActionsMenu {...defaultProps} />);
      const item = screen.getByText('Action 1');
      fireEvent.keyDown(item, { key: 'Enter', preventDefault: jest.fn() });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('handles Space key press', () => {
      render(<ActionsMenu {...defaultProps} />);
      const item = screen.getByText('Action 1');
      fireEvent.keyDown(item, { key: ' ', preventDefault: jest.fn() });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onClick for other keys', () => {
      render(<ActionsMenu {...defaultProps} />);
      const item = screen.getByText('Action 1');
      fireEvent.keyDown(item, { key: 'Tab', preventDefault: jest.fn() });
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  it('handles empty items array', () => {
    render(<ActionsMenu items={[]} />);
    expect(screen.queryByText(/Action/)).not.toBeInTheDocument();
  });

  it('handles undefined items prop', () => {
    render(<ActionsMenu />);
    expect(screen.queryByText(/Action/)).not.toBeInTheDocument();
  });
});
