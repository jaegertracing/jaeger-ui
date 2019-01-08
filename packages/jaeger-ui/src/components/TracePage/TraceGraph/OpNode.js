// @flow

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

import * as React from 'react';
import { Popover } from 'antd';
import cx from 'classnames';
import _get from 'lodash/get';
import _map from 'lodash/map';
import _memoize from 'lodash/memoize';
import { connect } from 'react-redux';

import { mapStateToProps } from '../../common/GraphSearch';
import filterSpans from '../../../utils/filter-spans';
import colorGenerator from '../../../utils/color-generator';

import type { PVertex, DenseSpan } from '../../../model/trace-dag/types';

import './OpNode.css';

type Props = {
  count: number,
  errors: number,
  time: number,
  percent: number,
  selfTime: number,
  percentSelfTime: number,
  operation: string,
  service: string,
  mode: string,
  graphSearch: string,
  members: DenseSpan[],
};

export const MODE_SERVICE = 'service';
export const MODE_TIME = 'time';
export const MODE_SELFTIME = 'selftime';

export const HELP_TABLE = (
  <table className="OpNode OpNode--mode-service">
    <tbody>
      <tr>
        <td className="OpNode--metricCell">Count / Error</td>
        <td className="OpNode--labelCell">
          <strong>Service</strong>
        </td>
        <td className="OpNode--metricCell">Avg</td>
      </tr>
      <tr>
        <td className="OpNode--metricCell">Duration</td>
        <td className="OpNode--labelCell">Operation</td>
        <td className="OpNode--metricCell">Self time</td>
      </tr>
    </tbody>
  </table>
);

export function round2(percent: number) {
  return Math.round(percent * 100) / 100;
}

export default class OpNode extends React.PureComponent<Props> {
  props: Props;
  filterSpans: typeof filterSpans;
  static defaultProps = {
    graphSearch: '',
  };

  constructor(props: Props) {
    super(props);
    this.filterSpans = _memoize(filterSpans);
  }

  render() {
    const {
      count,
      errors,
      time,
      percent,
      selfTime,
      percentSelfTime,
      operation,
      service,
      mode,
      graphSearch,
    } = this.props;

    // Spans over 20 % time are full red - we have probably to reconsider better approach
    let backgroundColor;
    if (mode === MODE_TIME) {
      const percentBoosted = Math.min(percent / 20, 1);
      backgroundColor = [255, 0, 0, percentBoosted].join();
    } else if (mode === MODE_SELFTIME) {
      backgroundColor = [255, 0, 0, percentSelfTime / 100].join();
    } else {
      backgroundColor = colorGenerator
        .getRgbColorByKey(service)
        .concat(0.8)
        .join();
    }

    const className = cx('OpNode', `OpNode--mode-${mode}`, {
      'is-graph-search-match': _get(this.filterSpans(graphSearch, _map(this.props.members, 'span')), 'size'),
    });

    const table = (
      <table className={className} cellSpacing="0">
        <tbody
          style={{
            background: `rgba(${backgroundColor})`,
          }}
        >
          <tr>
            <td className="OpNode--metricCell OpNode--count">
              {count} / {errors}
            </td>
            <td className="OpNode--labelCell OpNode--service">
              <strong>{service}</strong>
            </td>
            <td className="OpNode--metricCell OpNode--avg">{round2(time / 1000 / count)} ms</td>
          </tr>
          <tr>
            <td className="OpNode--metricCell OpNode--time">
              {time / 1000} ms ({round2(percent)} %)
            </td>
            <td className="OpNode--labelCell OpNode--op">{operation}</td>
            <td className="OpNode--metricCell OpNode--selfTime">
              {selfTime / 1000} ms ({round2(percentSelfTime)} %)
            </td>
          </tr>
        </tbody>
      </table>
    );

    return (
      <Popover overlayClassName="OpNode--popover" mouseEnterDelay={0.25} content={table}>
        {table}
      </Popover>
    );
  }
}

const ConnectedOpNode = connect(mapStateToProps)(OpNode);

export function getNodeDrawer(mode: string) {
  return function drawNode<T>(vertex: PVertex<T>) {
    const { data, members, operation, service } = vertex.data;
    return (
      <ConnectedOpNode {...data} members={members} mode={mode} operation={operation} service={service} />
    );
  };
}
