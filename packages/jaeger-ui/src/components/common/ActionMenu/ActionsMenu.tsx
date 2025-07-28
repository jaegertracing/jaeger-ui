// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Checkbox } from 'antd';
import './ActionsMenu.css';

export interface IActionMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isVisible?: boolean;
  checkboxProps?: {
    checked: boolean;
    indeterminate?: boolean;
  };
}

interface IActionsMenuProps {
  items?: IActionMenuItem[];
  className?: string;
  style?: React.CSSProperties;
}

export const ActionsMenu: React.FC<IActionsMenuProps> = ({ items = [], className, style }) => {
  const handleKeyDown = (item: IActionMenuItem) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      item.onClick?.();
    }
  };

  return (
    <div className={className} style={style}>
      {items.map(item => {
        if (item.isVisible === false) return null;

        const content = (
          <>
            <span className="NodeContent--actionsItemIconWrapper">
              {item.checkboxProps ? (
                <Checkbox
                  checked={item.checkboxProps.checked}
                  indeterminate={item.checkboxProps.indeterminate}
                />
              ) : (
                item.icon
              )}
            </span>
            <span className="NodeContent--actionsItemText">{item.label}</span>
          </>
        );

        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              className="NodeContent--actionsItem"
              onClick={item.onClick}
              onKeyDown={handleKeyDown(item)}
              tabIndex={0}
            >
              {content}
            </a>
          );
        }

        return (
          <a
            key={item.id}
            className="NodeContent--actionsItem"
            onClick={item.onClick}
            onKeyDown={handleKeyDown(item)}
            role="button"
            tabIndex={0}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
};

export default ActionsMenu;
