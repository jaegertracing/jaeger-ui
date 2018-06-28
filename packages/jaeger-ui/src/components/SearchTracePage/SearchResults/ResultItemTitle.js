// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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
import { Checkbox } from 'antd';
import { Link } from 'react-router-dom';

import { FALLBACK_TRACE_NAME } from '../../../constants';
import { formatDuration } from '../../../utils/date';

import './ResultItemTitle.css';

type Props = {
  duration: number,
  durationPercent: number,
  isSelectedForComparison: boolean,
  linkTo: ?string,
  toggleComparison: (string, boolean) => void,
  traceID: string,
  traceName: string,
};

export default class ResultItemTitle extends React.PureComponent<Props> {
  props: Props;

  static defaultProps = {
    durationPercent: 0,
    linkTo: null,
  };

  toggleComparison = () => {
    const { isSelectedForComparison, toggleComparison, traceID } = this.props;
    toggleComparison(traceID, isSelectedForComparison);
  };

  render() {
    const { duration, durationPercent, isSelectedForComparison, linkTo, traceID, traceName } = this.props;
    let WrapperComponent = 'div';
    const wrapperProps: { [string]: string } = { className: 'ResultItemTitle--item ub-flex-auto' };
    if (linkTo) {
      WrapperComponent = Link;
      wrapperProps.to = linkTo;
    }
    return (
      <div className="ResultItemTitle">
        <Checkbox
          className="ResultItemTitle--item ub-flex-none"
          onChange={this.toggleComparison}
          checked={isSelectedForComparison}
        />
        <WrapperComponent {...wrapperProps}>
          <span className="ResultItemTitle--durationBar" style={{ width: `${durationPercent}%` }} />
          <span className="ub-right ub-relative">{formatDuration(duration * 1000)}</span>
          <h3 className="ub-m0 ub-relative">
            {traceName || FALLBACK_TRACE_NAME}
            <small className="ResultItemTitle--idExcerpt">{traceID.slice(0, 7)}</small>
          </h3>
        </WrapperComponent>
      </div>
    );
  }
}
