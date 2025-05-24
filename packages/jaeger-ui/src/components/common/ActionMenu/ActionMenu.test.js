// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from 'antd';
import { IoLocate } from 'react-icons/io5';
import NewWindowIcon from '../NewWindowIcon';
import ActionsMenu from './ActionsMenu';

describe('<ActionsMenu>', () => {
  const mockOnClick = jest.fn();
  const mockHref = 'http://example.com';
  const mockIcon = <IoLocate / data-testid="iolocate">;
  const mockNewWindowIcon = <NewWindowIcon / data-testid="newwindowicon">;

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

  let rendered;
  beforeEach(() => {
    rendered = render(<ActionsMenu {...defaultProps} / data-testid="actionsmenu">);
    jest.clearAllMocks();
  });

  it('renders without exploding', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders all visible menu items', () => {
    const menuItems = wrapper.find('.NodeContent--actionsItem');
    expect(menuItems).toHaveLength(3);
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
    rendered = render({ items: itemsWithHidden });
    const menuItems = wrapper.find('.NodeContent--actionsItem');
    expect(menuItems).toHaveLength(3);
  });

  it('renders menu items with icons', () => {
    const firstItem = wrapper.find('.NodeContent--actionsItem').first();
    expect(firstItem.find('.NodeContent--actionsItemIconWrapper').find(IoLocate)).toHaveLength(1);
  });

  it('renders menu items with links', () => {
    const secondItem = wrapper.find('.NodeContent--actionsItem').at(1);
    expect(secondItem.prop('href')).toBe(mockHref);
  });

  it('renders menu items with checkboxes', () => {
    const thirdItem = wrapper.find('.NodeContent--actionsItem').last();
    const checkbox = thirdItem.find('.NodeContent--actionsItemIconWrapper').find(Checkbox);
    expect(checkbox).toHaveLength(1);
    expect(checkbox.prop('checked')).toBe(true);
    expect(checkbox.prop('indeterminate')).toBe(false);
  });

  it('calls onClick handler when clicking a menu item', () => {
    const firstItem = wrapper.find('.NodeContent--actionsItem').first();
    firstItem.simulate('click');
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('handles menu items without icons', () => {
    const thirdItem = wrapper.find('.NodeContent--actionsItem').last();
    const iconWrapper = thirdItem.find('.NodeContent--actionsItemIconWrapper');
    expect(iconWrapper.find(IoLocate)).toHaveLength(0);
    expect(iconWrapper.find(Checkbox)).toHaveLength(1);
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-class';
    rendered = render({ className: customClass });
    expect(wrapper.find(`.${customClass}`)).toHaveLength(1);
  });

  it('renders menu items with proper accessibility attributes', () => {
    const menuItems = wrapper.find('.NodeContent--actionsItem');
    menuItems.forEach((item, _) => {
      expect(item.prop('tabIndex')).toBe(0);
      if (!item.prop('href')) {
        expect(item.prop('role')).toBe('button');
      }
    });
  });

  describe('keyboard navigation', () => {
    it('handles Enter key press', () => {
      const firstItem = wrapper.find('.NodeContent--actionsItem').first();
      firstItem.simulate('keyDown', { key: 'Enter', preventDefault: jest.fn() });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('handles Space key press', () => {
      const firstItem = wrapper.find('.NodeContent--actionsItem').first();
      firstItem.simulate('keyDown', { key: ' ', preventDefault: jest.fn() });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onClick for other keys', () => {
      const firstItem = wrapper.find('.NodeContent--actionsItem').first();
      firstItem.simulate('keyDown', { key: 'Tab', preventDefault: jest.fn() });
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  it('handles empty items array', () => {
    rendered = render({ items: [] });
    const menuItems = wrapper.find('.NodeContent--actionsItem');
    expect(menuItems).toHaveLength(0);
  });

  it('handles undefined items prop', () => {
    rendered = render({ items: undefined });
    const menuItems = wrapper.find('.NodeContent--actionsItem');
    expect(menuItems).toHaveLength(0);
  });
});
