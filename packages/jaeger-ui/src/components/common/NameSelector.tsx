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

import React, { useState, useEffect, useRef } from 'react';
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

const NameSelector: React.FC<TProps> = ({
  label,
  placeholder = false,
  options,
  value,
  setValue,
  required = false,
  clearValue,
}) => {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const listRef = useRef<FilteredList>(null);

  useEffect(() => {
    if (listRef.current && popoverVisible) {
      listRef.current.focusInput();
    }
  }, [popoverVisible]);

  const changeVisible = (visible: boolean) => {
    setPopoverVisible(visible);

    setTimeout(() => {
      if (visible) {
        window.document.body.addEventListener('click', onBodyClicked);
      } else {
        window.document.body.removeEventListener('click', onBodyClicked);
      }
    });
  };

  const handleClearValue = (evt: React.MouseEvent) => {
    if (required) throw new Error('Cannot clear value of required NameSelector');

    evt.stopPropagation();
    clearValue?.();
  };

  const handleSetValue = (value: string) => {
    setValue(value);
    changeVisible(false);
  };

  const onBodyClicked = () => {
    if (listRef.current && !listRef.current.isMouseWithin()) {
      changeVisible(false);
    }
  };

  const onFilterCancelled = () => {
    changeVisible(false);
  };

  const onPopoverVisibleChanged = (visible: boolean) => {
    changeVisible(visible);
  };

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
      overlayClassName="NameSelector--overlay u-rm-popover-content-padding"
      onOpenChange={onPopoverVisibleChanged}
      placement="bottomLeft"
      content={
        <FilteredList
          ref={listRef}
          cancel={onFilterCancelled}
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
        {!required && value && <IoClose className="NameSelector--clearIcon" onClick={handleClearValue} />}
      </h2>
    </Popover>
  );
};

export default NameSelector;
