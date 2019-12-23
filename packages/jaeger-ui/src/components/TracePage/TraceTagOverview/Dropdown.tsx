// Copyright (c) 2018 The Jaeger Authors.
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

import React, { Component } from 'react';
import { Button, Dropdown, Icon, Menu } from 'antd';
import './Dropdown.css';
import { Trace } from '../../../types/trace';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';
import { ITableSpan } from './types';

type Props = {
  position: number;
  trace: Trace;
  tableValue: ITableSpan[];
  content: string[];
  setDropDownTitle: (title: string) => void;
  title: string;
  firstDropdownTitle: string;
  handler: (tableSpan: ITableSpan[]) => void;
};

const serviceName = 'Service Name';
const operationName = 'Operation Name';
const noItemSelected = 'No Item selected';

/**
 * Used to build the Dropdown.
 */
export default class DropDown extends Component<Props> {
  constructor(props: any) {
    super(props);

    if (this.props.position === 1) {
      this.props.handler(getColumnValues(serviceName, this.props.trace));
    }
  }

  /**
   * Is called if a tag is clicked.
   * @param title name of the clicked tag
   */
  tagIsClicked(title: string) {
    this.props.setDropDownTitle(title);
    if (this.props.position === 1) {
      this.props.handler(getColumnValues(title, this.props.trace));
    } else {
      this.props.handler(
        getColumnValuesSecondDropdown(
          this.props.tableValue,
          this.props.firstDropdownTitle,
          title,
          this.props.trace
        )
      );
    }
  }

  render() {
    const menu = (
      <Menu>
        {this.props.content.map((title: any) => (
          <Menu.Item key={title}>
            <a onClick={() => this.tagIsClicked(title)} role="button">
              {title !== serviceName && title !== operationName ? `Tag: ${title}` : `${title}`}
            </a>
          </Menu.Item>
        ))}
      </Menu>
    );
    const buttonTitleTag =
      this.props.title !== serviceName &&
      this.props.title !== operationName &&
      this.props.title !== noItemSelected
        ? `Tag: ${this.props.title}`
        : `${this.props.title}`;
    return (
      <div className="DropDown">
        <Dropdown overlay={menu}>
          <Button>
            {buttonTitleTag} <Icon type="down" />
          </Button>
        </Dropdown>
      </div>
    );
  }
}
