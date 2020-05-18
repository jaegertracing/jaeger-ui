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
import _isEmpty from 'lodash/isEmpty';

import ExamplesLink, { TExample } from '../ExamplesLink';
import FilteredList from '../FilteredList';

import { TFilterDropdownProps } from './types';

import './DetailTableDropdown.css';

type TProps = TFilterDropdownProps & {
  options: Set<string>;
};

export default class DetailTableDropdown extends React.PureComponent<TProps> {
  cancelled = false;
  selected: Array<React.Key> = [];

  constructor(props: TProps) {
    super(props);
    // TODO CONFIRM THIS STAYS UP TO DATE WHEN CLICKING OUTSIDE DROPDOWN
    this.selected = props.selectedKeys;
  }

  componentDidUpdate() {
    if (this.cancelled) {
      this.cancelled = false;
      this.props.confirm();
    }
  }

  cancel = () => {
    this.cancelled = true;
    this.props.setSelectedKeys(this.selected);
  };

  confirm = () => {
    // TODO CONFIRM THIS IS NECESSARY OR IF CONSTRUCTOR COVERS IT
    this.selected = this.props.selectedKeys;
    this.props.confirm();
  };

  render() {
    const { clearFilters = () => {}, options, selectedKeys, setSelectedKeys } = this.props;

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
        <div className="DetailDropdown--Footer">
          <Tooltip title="Remove filter from this column">
            <Button className="DetailDropdown--Btn Clear" onClick={clearFilters}>
              <FaTrash size={18} />
              Clear Filter
            </Button>
          </Tooltip>
          <div className="DetailDropdown--Footer--CancelConfirm">
            <Tooltip title="Cancel changes to this column's filter">
              <Button className="DetailDropdown--Btn Cancel" onClick={this.cancel}>
                <TiCancel size={20} />
                Cancel
              </Button>
            </Tooltip>
            <Tooltip title="Apply changes to this column's filter\nSame effect as clicking outside the dropdown">
              <Button className="DetailDropdown--Btn Apply" onClick={this.confirm}>
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
