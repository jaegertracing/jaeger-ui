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

import * as _ from 'lodash';
import React, { Component } from 'react';
import './MainTableData.css';
import { ITableSpan } from './types';

type Props = {
  oneSpan: ITableSpan;
  name: string;
  searchColor: string;
  values: any[];
  columnsArray: any;
  togglePopup: any;
  dropdownTestTitle1: string;
  dropdowntestTitle2: string;
  color: string;
  clickColumn: (name: string) => void;
};

type State = {
  element: any;
};

/**
 * Used to render the main column.
 */
export default class MainTableData extends Component<Props, State> {
  componentWillMount() {
    const element = this.props.values.map(item => {
      return { uid: _.uniqueId('id'), value: item };
    });

    this.setState(prevState => {
      return {
        ...prevState,
        element,
      };
    });
  }

  render() {
    const trOption1 = {
      background: this.props.searchColor,
      borderColor: this.props.searchColor,
      cursor: 'pointer',
    };

    const trOption2 = {
      background: this.props.searchColor,
      borderColor: this.props.searchColor,
    };

    const labelOption1 = {
      borderColor: this.props.color,
      color: 'rgb(153,153,153)',
      fontStyle: 'italic',
    };

    const labelOption2 = {
      borderColor: this.props.color,
    };

    const others = 'Others';
    const noItemSelected = 'No Item selected';

    const trStyle = this.props.dropdowntestTitle2 !== noItemSelected ? trOption1 : trOption2;
    const onClickOption =
      this.props.dropdownTestTitle1 === 'sql' && this.props.name !== others
        ? () => this.props.togglePopup(this.props.name)
        : undefined;
    const labelStyle = this.props.name === others ? labelOption1 : labelOption2;
    return (
      <tr
        className="MainTableData--tr"
        onClick={() => this.props.clickColumn(this.props.name)}
        style={trStyle}
      >
        <td className="MainTableData--td">
          <a role="button" onClick={onClickOption} style={{ color: 'inherit' }}>
            <label title={this.props.name} className="MainTableData--labelBorder" style={labelStyle}>
              {this.props.name}
            </label>
          </a>
        </td>

        {this.state.element.map((element: any, index: number) => (
          <td key={element.uid} className="MainTableData--td">
            {' '}
            {this.props.columnsArray[index + 1].isDecimal ? element.value.toFixed(2) : element.value}
            {this.props.columnsArray[index + 1].suffix}
          </td>
        ))}
      </tr>
    );
  }
}
