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

import * as React from 'react';
import { Button, Tooltip } from 'antd';
import FaCheck from 'react-icons/lib/fa/check.js';
import FaTrash from 'react-icons/lib/fa/trash.js';
import TiCancel from 'react-icons/lib/ti/cancel.js';

import FilteredList from '../FilteredList';

import { TFilterDropdownProps } from './types';

import './DetailTableDropdown.css';

type TProps = TFilterDropdownProps & {
  options: Set<string>;
};

export default class DetailTableDropdown extends React.PureComponent<TProps> {
  cancelled = false;
  selected: React.Key[] = [];

  componentDidUpdate(prevProps: TProps) {
    const { confirm, selectedKeys } = this.props;

    // If the entries in selectedKeys is unchanged, the dropdown has opened or closed.
    // Record the selectedKeys at this time for future cancellations.
    if (selectedKeys.length === prevProps.selectedKeys.length) {
      const prevKeys = new Set(prevProps.selectedKeys);
      if (selectedKeys.every(key => prevKeys.has(key))) {
        this.selected = selectedKeys;
      }
    }

    // Unfortunately antd requires setSelectedKeys and confirm to be called in different cycles.
    if (this.cancelled) {
      this.cancelled = false;
      confirm();
    }
  }

  cancel = () => {
    // Unfortunately antd requires setSelectedKeys and confirm to be called in different cycles.
    this.cancelled = true;
    this.props.setSelectedKeys(this.selected);
  };

  render() {
    const { clearFilters = () => {}, confirm, options, selectedKeys, setSelectedKeys } = this.props;

    const value = new Set<string>();
    selectedKeys.forEach(selected => {
      if (typeof selected === 'string') value.add(selected);
    });

    return (
      <div>
        <FilteredList
          addValues={(values: string[]) => {
            setSelectedKeys([...selectedKeys, ...values]);
          }}
          multi
          options={Array.from(options)}
          removeValues={(values: string[]) => {
            const remove = new Set<React.Key>(values);
            setSelectedKeys(selectedKeys.filter(key => !remove.has(key)));
          }}
          setValue={(v: string) => {
            setSelectedKeys([v]);
          }}
          value={value}
        />
        <div className="DetailTableDropdown--Footer">
          <Tooltip overlayClassName="DetailTableDropdown--Tooltip" title="Remove filter from this column">
            <Button className="DetailTableDropdown--Btn Clear" onClick={clearFilters}>
              <FaTrash size={18} />
              Clear Filter
            </Button>
          </Tooltip>
          <div className="DetailTableDropdown--Footer--CancelConfirm">
            <Tooltip
              overlayClassName="DetailTableDropdown--Tooltip"
              title="Cancel changes to this column's filter"
            >
              <Button className="DetailTableDropdown--Btn Cancel" onClick={this.cancel}>
                <TiCancel size={20} />
                Cancel
              </Button>
            </Tooltip>
            <Tooltip
              overlayClassName="DetailTableDropdown--Tooltip"
              title={
                <div className="DetailTableDropdown--Tooltip--Body">
                  <span>Apply changes to this column{"'"}s filter</span>
                  <span>Same effect as clicking outside the dropdown</span>
                </div>
              }
            >
              <Button className="DetailTableDropdown--Btn Apply" onClick={confirm}>
                <FaCheck size={18} />
                Apply
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }
}
