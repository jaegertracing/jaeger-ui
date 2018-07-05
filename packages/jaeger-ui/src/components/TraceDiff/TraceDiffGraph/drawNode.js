// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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
import cx from 'classnames';

import type { PVertex } from '../../../model/trace-dag/types';

import './drawNode.css';

type Props = {
  a: number,
  b: number,
  operation: string,
  service: string,
};

const abs = Math.abs;
const max = Math.max;

class DiffNode extends React.PureComponent<Props> {
  props: Props;

  render() {
    const { a, b, operation, service } = this.props;
    const isSame = a === b;
    const classNames = cx({
      'is-same': isSame,
      'is-changed': !isSame,
      'is-more': b > a,
      'is-added': a === 0,
      'is-less': b < a,
      'is-removed': b === 0,
    });
    const chgSign = a < b ? '+' : '-';
    return (
      <table className={`DiffNode ${classNames}`}>
        <tbody>
          <tr>
            <td className={`DiffNode--metricCell ${classNames}`} rowSpan={isSame ? 2 : 1}>
              {isSame ? null : <span className="DiffNode--metricSymbol">{chgSign}</span>}
              {isSame ? a : abs(b - a)}
            </td>
            <td className={`DiffNode--labelCell ${classNames}`}>
              <strong>{service}</strong>
            </td>
          </tr>
          <tr>
            {isSame ? null : (
              <td className={`DiffNode--metricCell ${classNames}`}>
                <span className="DiffNode--metricSymbol">{chgSign}</span>
                {a === 0 || b === 0 ? 100 : abs((a - b) / max(a, b) * 100).toFixed(0)}
                <span className="DiffNode--metricSymbol">%</span>
              </td>
            )}
            <td className={`DiffNode--labelCell ${classNames}`}>{operation}</td>
          </tr>
        </tbody>
      </table>
    );
  }
}

export default function drawNode<T>(vertex: PVertex<T>) {
  const { data, operation, service } = vertex.data;
  return <DiffNode {...data} operation={operation} service={service} />;
}
