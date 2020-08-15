// Copyright (c) 2020 The Jaeger Authors.
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
import { ITableValues, IColumnValue } from './types';

type Props = {
  type: string;
  name: string;
  searchColor: string;
  values: ITableValues[];
  columnsArray: IColumnValue[];
  togglePopup: any;
  valueNameSelector1: string;
  valueNameSelector2: string | null;
  color: string;
  clickColumn: (name: string) => void;
  colorToPercent: string;
};

type State = {
  element: any;
};

/**
 * Used to render the main column.
 */
export default class MainTableData extends Component<Props, State> {
  constructor(props: Readonly<Props>) {
    super(props);
    const element = this.props.values.map(item => {
      return { uid: _.uniqueId('id'), value: item };
    });

    this.state = { element };
  }

  render() {
    const styleOption1 = {
      background: this.props.colorToPercent,
      borderColor: this.props.colorToPercent,
      cursor: 'default',
    };

    const styleOption2 = {
      background: this.props.searchColor,
      borderColor: this.props.searchColor,
      cursor: 'default',
    };

    const labelOption1 = {
      color: 'rgb(153,153,153)',
      fontStyle: 'italic',
    };

    const labelOption2 = {
      borderLeft: '4px solid transparent',
      paddingLeft: '0.6em',
      borderColor: this.props.color,
    };

    const others = 'undefined';

    let styleCondition;
    if (this.props.type === others) {
      if (this.props.valueNameSelector2 !== null && this.props.type !== 'undefined') {
        styleOption1.cursor = 'pointer';
      }
      styleCondition = styleOption1;
    } else if (this.props.searchColor === 'transparent') {
      if (this.props.valueNameSelector2 !== null) {
        styleOption1.cursor = 'pointer';
      }
      styleCondition = styleOption1;
    } else {
      if (this.props.valueNameSelector2 !== null) {
        styleOption1.cursor = 'pointer';
      }
      styleCondition = styleOption2;
    }

    let labelCondition;
    if (this.props.color !== '') {
      labelCondition = labelOption2;
    } else if (this.props.type === 'undefined') {
      labelCondition = labelOption1;
    } else {
      labelCondition = undefined;
    }

    const onClickOption =
      this.props.valueNameSelector1 === 'sql' && this.props.type !== others
        ? () => this.props.togglePopup(this.props.name)
        : undefined;
    return (
      <tr
        className="MainTableData--tr"
        onClick={() => this.props.clickColumn(this.props.name)}
        style={styleCondition}
      >
        <td className="MainTableData--td">
          <a role="button" onClick={onClickOption} style={{ color: 'inherit' }}>
            <label title={this.props.name} className="MainTableData--label" style={labelCondition}>
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
