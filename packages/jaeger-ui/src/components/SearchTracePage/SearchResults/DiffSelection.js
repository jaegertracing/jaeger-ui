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
import { Button } from 'antd';

import ResultItemTitle from './ResultItemTitle';

import type { TraceSummary } from '../../../types/search';

import './DiffSelection.css';

type Props = {
  toggleComparison: (string, boolean) => void,
  traces: TraceSummary[],
};

const CTA_MESSAGE = <h2 className="ub-m0">Compare traces by selecting result items</h2>;

export default class DiffSelection extends React.PureComponent<Props> {
  props: Props;

  render() {
    const { toggleComparison, traces } = this.props;
    return (
      <div className={`DiffSelection ${traces.length ? 'is-non-empty' : ''} ub-mb3`}>
        {traces.length > 0 && (
          <div className="DiffSelection--selectedItems">
            {traces.map(trace => (
              <ResultItemTitle
                key={trace.traceID}
                duration={trace.duration}
                isSelectedForComparison
                toggleComparison={toggleComparison}
                traceID={trace.traceID}
                traceName={trace.traceName}
              />
            ))}
          </div>
        )}
        <div className="DiffSelection--message">
          {traces.length > 0 ? (
            <React.Fragment>
              <Button className="ub-right" disabled={traces.length < 2} type="primary">
                Compare Traces
              </Button>
              <h2 className="ub-m0">{traces.length} Selected for comparison</h2>
            </React.Fragment>
          ) : (
            CTA_MESSAGE
          )}
        </div>
      </div>
    );
  }
}
