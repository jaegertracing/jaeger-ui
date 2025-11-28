// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Popover } from 'antd';
import cx from 'classnames';
import { IoChevronDown, IoClose } from 'react-icons/io5';

import BreakableText from './BreakableText';
import FilteredList, { IFilteredListRef } from './FilteredList';

import './NameSelector.css';

type TOptional = {
  clearValue: () => void;
  required?: false;
};

type TRequired = {
  clearValue?: never;
  required: true;
};

type TProps = {
  label: string;
  placeholder?: boolean | string;
  options: string[];
  value: string | null;
  setValue: (value: string) => void;
} & (TOptional | TRequired);

export const DEFAULT_PLACEHOLDER = 'Select a value…';

/**
 * NameSelector is a custom header-style dropdown component that provides
 * advanced features for selecting from a list of options.
 *
 * Features:
 * - Header-style display with label, value, chevron icon, and optional clear button
 * - Virtualized list rendering (via @tanstack/react-virtual) for large lists
 * - Fuzzy matching search using match-sorter library
 * - Full keyboard navigation (Arrow keys, Enter, Escape)
 * - Support for required/optional modes with clear value functionality
 *
 * Use this component for:
 * - Page headers and navigation selectors
 * - Cases with large option lists that benefit from virtualization
 * - When fuzzy matching search is preferred over exact label matching
 * - When custom header-style appearance is needed
 *
 * For standard form dropdowns with simpler filtering needs, consider using
 * SearchableSelect instead.
 *
 * @see SearchableSelect - For lightweight form dropdowns
 * @see FilteredList - The underlying filterable list component
 */
const NameSelector: React.FC<TProps> = props => {
  const { label, options, placeholder = false, required = false, value, setValue, clearValue } = props;

  // Throw error if required and clearValue are both provided
  if (required && clearValue) {
    throw new Error('Cannot clear value of required NameSelector');
  }

  const [popoverVisible, setPopoverVisible] = useState(false);
  const listRef = useRef<IFilteredListRef>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (listRef.current && popoverVisible) {
      listRef.current.focusInput();
    }
  }, [popoverVisible]);

  const handleVisibilityChange = useCallback((visible: boolean) => {
    setPopoverVisible(visible);
  }, []);

  const clearValueHandler = useCallback(
    (evt: React.MouseEvent) => {
      evt.stopPropagation();
      clearValue!();
    },
    [clearValue]
  );

  const handleSetValue = useCallback(
    (newValue: string) => {
      setValue(newValue);
      setPopoverVisible(false);
    },
    [setValue]
  );

  const handleFilterCancelled = useCallback(() => {
    setPopoverVisible(false);
  }, []);

  const rootCls = cx('NameSelector', {
    'is-active': popoverVisible,
    'is-invalid': required && !value,
  });

  let useLabel = true;
  let text = value || '';
  if (!value && placeholder) {
    useLabel = false;
    text = typeof placeholder === 'string' ? placeholder : DEFAULT_PLACEHOLDER;
  }

  return (
    <Popover
      classNames={{ root: 'NameSelector--overlay u-rm-popover-content-padding' }}
      onOpenChange={handleVisibilityChange}
      placement="bottomLeft"
      content={
        <FilteredList
          ref={listRef}
          cancel={handleFilterCancelled}
          options={options}
          value={value}
          setValue={handleSetValue}
        />
      }
      trigger="click"
      open={popoverVisible}
    >
      <h2 className={rootCls}>
        {useLabel && <span className="NameSelector--label">{label}:</span>}
        <BreakableText className="NameSelector--value" text={text} />
        <IoChevronDown className="NameSelector--chevron" />
        {!required && value && (
          <IoClose
            className="NameSelector--clearIcon"
            onClick={clearValueHandler}
            data-testid="name-selector-clear"
          />
        )}
      </h2>
    </Popover>
  );
};

export default NameSelector;
