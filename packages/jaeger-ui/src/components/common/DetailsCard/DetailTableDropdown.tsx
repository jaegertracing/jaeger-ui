// Copyright (c) 2020 Uber Technologies, Inc.
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

// @ts-nocheck
import React, { Key, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { IoTrash, IoBan, IoCheckmark } from 'react-icons/io5';

import FilteredList from '../FilteredList';

import { TFilterDropdownProps } from './types';

import './DetailTableDropdown.css';

type TProps = TFilterDropdownProps & {
  options: Set<string>;
};

const DetailTableDropdown: React.FC<TProps> = props => {
  const { clearFilters = () => {}, confirm, options, selectedKeys, setSelectedKeys } = props;
  const confirmedSelectionRef = useRef<Key[]>(selectedKeys);
  const [isCancelled, setIsCancelled] = useState(false);
  const prevSelectedKeysRef = useRef<Key[]>();

  useEffect(() => {
    const prevKeys = prevSelectedKeysRef.current;
    if (prevKeys && selectedKeys.length === prevKeys.length) {
      const prevKeysSet = new Set(prevKeys);
      if (selectedKeys.every(key => prevKeysSet.has(key))) {
        confirmedSelectionRef.current = selectedKeys;
      }
    }
    prevSelectedKeysRef.current = selectedKeys;

    if (isCancelled) {
      confirm();
      setIsCancelled(false);
    }
  }, [selectedKeys, isCancelled, confirm]);

  const cancel = useCallback(() => {
    setSelectedKeys(confirmedSelectionRef.current);
    setIsCancelled(true);
  }, [setSelectedKeys]);

  const value = useMemo(() => {
    const valueSet = new Set<string>();
    selectedKeys.forEach(selected => {
      if (typeof selected === 'string') valueSet.add(selected);
    });
    return valueSet;
  }, [selectedKeys]);

  const addValues = useCallback(
    (values: string[]) => {
      setSelectedKeys([...selectedKeys, ...values]);
    },
    [selectedKeys, setSelectedKeys]
  );

  const removeValues = useCallback(
    (values: string[]) => {
      const remove = new Set<Key>(values);
      setSelectedKeys(selectedKeys.filter(key => !remove.has(key)));
    },
    [selectedKeys, setSelectedKeys]
  );

  const setValue = useCallback(
    (v: string) => {
      setSelectedKeys([v]);
    },
    [setSelectedKeys]
  );

  return (
    <div>
      <FilteredList
        addValues={addValues}
        multi
        options={Array.from(options)}
        removeValues={removeValues}
        setValue={setValue}
        value={value}
      />
      <div className="DetailTableDropdown--Footer">
        <Tooltip classNames={{ root: 'DetailTableDropdown--Tooltip' }} title="Remove filter from this column">
          <Button className="DetailTableDropdown--Btn Clear" onClick={clearFilters}>
            <IoTrash size={18} />
            Clear Filter
          </Button>
        </Tooltip>
        <div className="DetailTableDropdown--Footer--CancelConfirm">
          <Tooltip
            classNames={{ root: 'DetailTableDropdown--Tooltip' }}
            title="Cancel changes to this column's filter"
          >
            <Button className="DetailTableDropdown--Btn Cancel" onClick={cancel}>
              <IoBan size={20} />
              Cancel
            </Button>
          </Tooltip>
          <Tooltip
            classNames={{ root: 'DetailTableDropdown--Tooltip' }}
            title={
              <div className="DetailTableDropdown--Tooltip--Body">
                <span>Apply changes to this column&apos;s filter</span>
                <span>Same effect as clicking outside the dropdown</span>
              </div>
            }
          >
            <Button className="DetailTableDropdown--Btn Apply" onClick={confirm}>
              <IoCheckmark size={18} />
              Apply
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DetailTableDropdown);
