// Copyright (c) 2019 Uber Technologies, Inc.
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

import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Popover } from 'antd';
import cx from 'classnames';
import { IoChevronDown, IoClose } from 'react-icons/io5';

import BreakableText from './BreakableText';
import FilteredList from './FilteredList';

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

const NameSelector: React.FC<TProps> = props => {
  const { label, options, placeholder = false, required = false, value, setValue, clearValue } = props;

  // Throw error if required and clearValue are both provided
  if (required && clearValue) {
    throw new Error('Cannot clear value of required NameSelector');
  }

  const [popoverVisible, setPopoverVisible] = useState(false);
  const listRef = useRef<FilteredList>(null);

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
