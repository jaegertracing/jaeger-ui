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
import { Popover } from 'antd';
import cx from 'classnames';
import _get from 'lodash/get';
import _map from 'lodash/map';
import _memoize from 'lodash/memoize';
import { connect } from 'react-redux';

import CopyIcon from '../../common/CopyIcon';
import { extractUIFindFromState } from '../../common/UIFindInput';
import filterSpans from '../../../utils/filter-spans';

import type { PVertex, DenseSpan } from '../../../model/trace-dag/types';

import './drawNode.css';

type Props = {
  a: number,
  b: number,
  uiFind: string,
  members: DenseSpan[],
  operation: string,
  service: string,
};

const abs = Math.abs;
const max = Math.max;

class DiffNode extends React.PureComponent<Props> {
  props: Props;
  filterSpans: typeof filterSpans;
  static defaultProps = {
    uiFind: '',
    meta: {},
  };

  constructor(props: Props) {
    super(props);
    this.filterSpans = _memoize(filterSpans);
  }

  render() {
    const { a, b, uiFind, /* meta, */ operation, service } = this.props;
    const isSame = a === b;
    const isUiFindMatch = _get(this.filterSpans(uiFind, _map(this.props.members, 'span')), 'size');
    const className = cx({
      'is-same': isSame,
      'is-changed': !isSame,
      'is-more': b > a && a > 0,
      'is-added': a === 0,
      'is-less': a > b && b > 0,
      'is-removed': b === 0,
      'is-ui-find-match': isUiFindMatch,
    });
    const chgSign = a < b ? '+' : '-';
    const table = (
      <table className={`DiffNode ${className}`}>
        <tbody>
          <tr>
            <td className={`DiffNode--metricCell ${className}`} rowSpan={isSame ? 2 : 1}>
              {isSame ? null : <span className="DiffNode--metricSymbol">{chgSign}</span>}
              {isSame ? a : abs(b - a)}
            </td>
            <td className={`DiffNode--labelCell ${className}`}>
              <strong>{service}</strong>
              <CopyIcon
                className="DiffNode--copyIcon"
                copyText={`${service} ${operation}`}
                tooltipTitle="Copy label"
              />
            </td>
          </tr>
          <tr>
            {isSame ? null : (
              <td className={`DiffNode--metricCell ${className}`}>
                <span className="DiffNode--metricSymbol">{chgSign}</span>
                {a === 0 || b === 0 ? 100 : abs((a - b) / max(a, b) * 100).toFixed(0)}
                <span className="DiffNode--metricSymbol">%</span>
              </td>
            )}
            <td className={`DiffNode--labelCell ${className}`}>{operation}</td>
          </tr>
        </tbody>
      </table>
    );

    return (
      <Popover overlayClassName={`DiffNode--popover ${className}`} mouseEnterDelay={0.25} content={table}>
        {table}
      </Popover>
    );
  }
}

const ConnectedDiffNode = connect(extractUIFindFromState)(DiffNode);

export default function drawNode<T>(vertex: PVertex<T>) {
  const { data, members, operation, service } = vertex.data;
  return <ConnectedDiffNode {...data} members={members} operation={operation} service={service} />;
}
