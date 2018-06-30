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

import LoadingIndicator from '../../common/LoadingIndicator';
import { FALLBACK_TRACE_NAME, fetchedState } from '../../../constants';
import { formatDuration } from '../../../utils/date';

import type { FetchedState } from '../../../types';
import type { ApiError } from '../../../types/api-error';

import './ResultItemTitle.css';

type Props = {
  duration: number,
  durationPercent: number,
  error?: ApiError,
  isInDiffCohort: boolean,
  linkTo: ?string,
  state: ?FetchedState,
  toggleComparison: (string, boolean) => void,
  traceID: string,
  traceName: string,
};

export default class ResultItemTitle extends React.PureComponent<Props> {
  props: Props;

  static defaultProps = {
    durationPercent: 0,
    error: undefined,
    state: fetchedState.DONE,
    linkTo: null,
  };

  toggleComparison = () => {
    const { isInDiffCohort, toggleComparison, traceID } = this.props;
    toggleComparison(traceID, isInDiffCohort);
  };

  render() {
    const {
      duration,
      durationPercent,
      error,
      isInDiffCohort,
      linkTo,
      state,
      traceID,
      traceName,
    } = this.props;
    let WrapperComponent = 'div';
    const wrapperProps: { [string]: string } = { className: 'ResultItemTitle--item ub-flex-auto' };
    if (linkTo) {
      WrapperComponent = Link;
      wrapperProps.to = linkTo;
    }
    const isErred = state === fetchedState.ERROR;
    let title = traceName || FALLBACK_TRACE_NAME;
    let errorCssClass = '';
    if (isErred) {
      errorCssClass = 'is-error';
      if (error) {
        title = typeof error === 'string' ? error : error.message || String(error);
      }
      if (!title) {
        title = 'Error: Unknown error';
      }
    } else if (state === fetchedState.LOADING) {
      title = <LoadingIndicator small />;
    }
    return (
      <div className="ResultItemTitle">
        <Checkbox
          className="ResultItemTitle--item ub-flex-none"
          onChange={!isErred ? this.toggleComparison : undefined}
          checked={!isErred && isInDiffCohort}
        />
        <WrapperComponent {...wrapperProps}>
          <span className="ResultItemTitle--durationBar" style={{ width: `${durationPercent}%` }} />
          {duration != null && <span className="ub-right ub-relative">{formatDuration(duration)}</span>}
          <h3 className={`ResultItemTitle--title ${errorCssClass}`}>
            {title}
            <small className="ResultItemTitle--idExcerpt">{traceID.slice(0, 7)}</small>
          </h3>
        </WrapperComponent>
      </div>
    );
  }
}
