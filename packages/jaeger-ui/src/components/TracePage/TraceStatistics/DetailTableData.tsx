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
import './DetailTableData.css';
import { ITableValues, IColumnValue } from './types';

type Props = {
  type: string;
  name: string;
  searchColor: string;
  values: ITableValues[];
  columnsArray: IColumnValue[];
  color: string;
  togglePopup: (name: string) => void;
  valueNameSelector2: string | null;
  colorToPercent: string;
};

type State = {
  element: any;
};

/**
 * Used to render the detail column.
 */
export default class DetailTableData extends Component<Props, State> {
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
      color: 'rgb(153,153,153)',
      fontStyle: 'italic',
    };

    const styleOption2 = {
      background: this.props.colorToPercent,
      borderColor: this.props.colorToPercent,
    };

    const styleOption3 = {
      background: this.props.searchColor,
      borderColor: this.props.searchColor,
    };
    const others = 'undefined';
    let styleCondition;
    if (this.props.type === others) {
      styleCondition = styleOption1;
    } else if (this.props.searchColor === 'rgb(248,248,248)') {
      styleCondition = styleOption2;
    } else {
      styleCondition = styleOption3;
    }
    const labelStyle1 = { borderColor: this.props.color };
    const labelStyle2 = { borderColor: this.props.color, marginLeft: '12px' };
    let labelCondition;
    if (this.props.valueNameSelector2 === 'Service Name') {
      labelCondition = labelStyle2;
    } else {
      labelCondition = labelStyle1;
    }
    const onClickOption =
      this.props.valueNameSelector2 === 'sql' && this.props.type !== others
        ? () => this.props.togglePopup(this.props.name)
        : undefined;
    return (
      <tr className="DetailTableData--tr" style={styleCondition}>
        <td className="DetailTableData--td">
          <a role="button" onClick={onClickOption} style={{ color: 'inherit' }}>
            <label title={this.props.name} className="DetailTableData--serviceBorder" style={labelCondition}>
              {this.props.name}
            </label>
          </a>
        </td>
        {this.state.element.map((element: any, index: number) => (
          <td key={element.uid} className="DetailTableData--td">
            {this.props.columnsArray[index + 1].isDecimal ? Number(element.value).toFixed(2) : element.value}
            {this.props.columnsArray[index + 1].suffix}
          </td>
        ))}
      </tr>
    );
  }
}
