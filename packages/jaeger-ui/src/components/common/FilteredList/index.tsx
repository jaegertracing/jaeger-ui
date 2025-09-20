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
import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Checkbox, Tooltip } from 'antd';
import _debounce from 'lodash/debounce';
import { matchSorter } from 'match-sorter';
import { IoSearch } from 'react-icons/io5';
import { FixedSizeList as VList, ListOnItemsRenderedProps, ListOnScrollProps } from 'react-window';
import { Key as EKey } from 'ts-key-enum';

import ListItem from './ListItem';

import './index.css';

const ITEM_HEIGHT = 35;
const MAX_HEIGHT = 375;

type TProps = {
  addValues?: (values: string[]) => void;
  cancel?: () => void;
  multi?: boolean;
  options: string[];
  removeValues?: (values: string[]) => void;
  setValue: (value: string) => void;
  value: Set<string> | string | null;
};

export interface IFilteredListRef {
  focusInput: () => void;
}

const FilteredList = forwardRef<IFilteredListRef, TProps>(
  ({ addValues, cancel, multi, options, removeValues, setValue, value }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const vlistRef = useRef<VList>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [filterText, setFilterText] = useState('');
    const [visibleStartIndex, setVisibleStartIndex] = useState(0);
    const [visibleStopIndex, setVisibleStopIndex] = useState(0);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({
      focusInput: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
    }));

    const hasMountedRef = useRef(false);
    useEffect(() => {
      if (hasMountedRef.current && inputRef.current) {
        inputRef.current.focus();
      }
      hasMountedRef.current = true;
    });

    const filteredOptions = useMemo(() => {
      return filterText ? matchSorter(options, filterText) : options;
    }, [options, filterText]);

    const getFilteredCheckbox = useCallback(
      (filtered: string[]) => {
        if (!addValues || !removeValues) return null;

        const valueSet = typeof value === 'string' || !value ? new Set([value]) : value;
        let checkedCount = 0;
        let indeterminate = false;
        for (let i = 0; i < filtered.length; i++) {
          const match = valueSet.has(filtered[i]);
          if (match) checkedCount++;
          if (checkedCount && checkedCount <= i) {
            indeterminate = true;
            break;
          }
        }
        const checked = Boolean(checkedCount) && checkedCount === filtered.length;
        const title = `Click to ${checked ? 'unselect' : 'select'} all ${
          filtered.length < options.length ? 'filtered ' : ''
        }options`;

        return (
          <Tooltip title={title}>
            <Checkbox
              className="FilteredList--filterCheckbox"
              checked={checked}
              disabled={!filtered.length}
              onChange={({ target: { checked: newCheckedState } }) => {
                if (newCheckedState) addValues(filtered.filter(f => !valueSet.has(f)));
                else removeValues(filtered);
              }}
              indeterminate={indeterminate}
            />
          </Tooltip>
        );
      },
      [addValues, removeValues, value, options.length]
    );

    const handleSetValue = useCallback(
      (newValue: string) => {
        setValue(newValue);
        setFilterText('');
        setFocusedIndex(null);
      },
      [setValue]
    );

    const onKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        switch (event.key) {
          case EKey.Escape: {
            setFilterText('');
            setFocusedIndex(null);
            if (cancel) cancel();
            break;
          }
          case EKey.ArrowUp:
          case EKey.ArrowDown: {
            let newFocusedIndex: number | null;
            if (focusedIndex == null) {
              newFocusedIndex = event.key === EKey.ArrowDown ? visibleStartIndex : visibleStopIndex;
              setFocusedIndex(newFocusedIndex);
            } else {
              const offset = event.key === EKey.ArrowDown ? 1 : -1;
              const i = focusedIndex + offset;
              newFocusedIndex = i > -1 ? i % filteredOptions.length : filteredOptions.length + i;
              setFocusedIndex(newFocusedIndex);
            }
            if (
              newFocusedIndex !== null &&
              (newFocusedIndex < visibleStartIndex + 1 || newFocusedIndex > visibleStopIndex - 1)
            ) {
              vlistRef.current?.scrollToItem(newFocusedIndex);
            }
            break;
          }
          case EKey.Enter: {
            if (focusedIndex !== null) handleSetValue(filteredOptions[focusedIndex]);
            else if (filteredOptions.length === 1) handleSetValue(filteredOptions[0]);
            break;
          }
          default: // no-op
        }
      },
      [focusedIndex, visibleStartIndex, visibleStopIndex, filteredOptions, cancel, handleSetValue]
    );

    const onListScrolled = useMemo(
      () =>
        _debounce((scrollInfo: ListOnScrollProps) => {
          if (!scrollInfo.scrollUpdateWasRequested) {
            setFocusedIndex(null);
          }
        }, 80),
      []
    );

    const onListItemsRendered = useMemo(
      () =>
        _debounce((viewInfo: ListOnItemsRenderedProps) => {
          const { visibleStartIndex: startIndex, visibleStopIndex: stopIndex } = viewInfo;
          setVisibleStartIndex(startIndex);
          setVisibleStopIndex(stopIndex);
        }, 80),
      []
    );

    const onFilterChanged = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      setFilterText(event.target.value);
      setFocusedIndex(null);
    }, []);

    const filteredCheckbox = multi && getFilteredCheckbox(filteredOptions);
    const data = {
      addValues,
      focusedIndex,
      highlightQuery: filterText,
      multi,
      options: filteredOptions,
      removeValues,
      selectedValue: value,
      setValue: handleSetValue,
    };

    return (
      <div ref={wrapperRef}>
        <div className="FilteredList--filterWrapper">
          {filteredCheckbox}
          <label className="FilteredList--inputWrapper">
            <IoSearch className="FilteredList--filterIcon" />
            <input
              className="FilteredList--filterInput"
              placeholder="Filter..."
              onChange={onFilterChanged}
              onKeyDown={onKeyDown}
              ref={inputRef}
              type="text"
              value={filterText}
            />
          </label>
        </div>
        <VList
          key={filterText}
          className="FilteredList--list u-simple-scrollbars"
          height={Math.min(options.length * ITEM_HEIGHT, MAX_HEIGHT)}
          itemCount={filteredOptions.length}
          itemData={data}
          itemSize={ITEM_HEIGHT}
          width={650}
          overscanCount={25}
          onItemsRendered={onListItemsRendered}
          onScroll={onListScrolled}
          ref={vlistRef}
        >
          {ListItem}
        </VList>
      </div>
    );
  }
);

FilteredList.displayName = 'FilteredList';
export default FilteredList;
