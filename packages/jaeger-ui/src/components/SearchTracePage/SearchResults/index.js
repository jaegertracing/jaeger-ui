// TODO: @ flow

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
import { Select } from 'antd';
import { Field, reduxForm, formValueSelector } from 'redux-form';

import DiffSelection from './DiffSelection';
import * as markers from './index.markers';
import ResultItem from './ResultItem';
import ScatterPlot from './ScatterPlot';
import LoadingIndicator from '../../common/LoadingIndicator';
import * as orderBy from '../../../model/order-by';
import { getPercentageOfDuration } from '../../../utils/date';
import prefixUrl from '../../../utils/prefix-url';
import reduxFormFieldAdapter from '../../../utils/redux-form-field-adapter';

import type { TraceSummary } from '../../../types/search';

import './index.css';

type SearchResultsProps = {
  addComparison: string => void,
  goToTrace: string => void,
  loading: boolean,
  maxTraceDuration: number,
  removeComparison: string => void,
  selectedForComparison: TraceSummary[],
  traces: TraceSummary[],
};

const Option = Select.Option;

/**
 * Contains the dropdown to sort and filter trace search results
 */
function SelectSortImpl() {
  return (
    <label className="ub-right">
      Sort:{' '}
      <Field name="sortBy" component={reduxFormFieldAdapter(Select)}>
        <Option value={orderBy.MOST_RECENT}>Most Recent</Option>
        <Option value={orderBy.LONGEST_FIRST}>Longest First</Option>
        <Option value={orderBy.SHORTEST_FIRST}>Shortest First</Option>
        <Option value={orderBy.MOST_SPANS}>Most Spans</Option>
        <Option value={orderBy.LEAST_SPANS}>Least Spans</Option>
      </Field>
    </label>
  );
}

const SelectSort = reduxForm({
  form: 'traceResultsSort',
  initialValues: {
    sortBy: orderBy.MOST_RECENT,
  },
})(SelectSortImpl);

export const sortFormSelector = formValueSelector('traceResultsSort');

export default class SearchResults extends React.PureComponent<SearchResultsProps> {
  props: SearchResultsProps;

  toggleComparison = (traceID: string, remove: boolean) => {
    const { addComparison, removeComparison } = this.props;
    if (remove) {
      removeComparison(traceID);
    } else {
      addComparison(traceID);
    }
  };

  render() {
    const { loading, selectedForComparison, traces } = this.props;
    const diffSelection = (
      <DiffSelection toggleComparison={this.toggleComparison} traces={selectedForComparison} />
    );
    if (loading) {
      return (
        <React.Fragment>
          {selectedForComparison.length > 0 && diffSelection}
          <LoadingIndicator className="u-mt-vast" centered />;
        </React.Fragment>
      );
    }
    if (!Array.isArray(traces) || !traces.length) {
      return (
        <React.Fragment>
          {selectedForComparison.length > 0 && diffSelection}
          <div className="u-simple-card" data-test={markers.NO_RESULTS}>
            No trace results. Try another query.
          </div>
        </React.Fragment>
      );
    }
    const { goToTrace, maxTraceDuration } = this.props;
    const comparingSet = new Set(selectedForComparison.map(tr => tr.traceID));
    return (
      <div>
        <div>
          <div className="SearchResults--header">
            <div className="ub-p3">
              <ScatterPlot
                data={traces.map(t => ({
                  x: t.timestamp,
                  y: t.duration,
                  traceID: t.traceID,
                  size: t.numberOfSpans,
                  name: t.traceName,
                }))}
                onValueClick={t => {
                  goToTrace(t.traceID);
                }}
              />
            </div>
            <div className="SearchResults--headerOverview">
              <SelectSort />
              <h2 className="ub-m0">
                {traces.length} Trace{traces.length > 1 && 's'}
              </h2>
            </div>
          </div>
        </div>
        <div>
          {diffSelection}
          <ul className="ub-list-reset">
            {traces.map(trace => (
              <li className="ub-my3" key={trace.traceID}>
                <ResultItem
                  durationPercent={getPercentageOfDuration(trace.duration, maxTraceDuration)}
                  isSelectedForComparison={comparingSet.has(trace.traceID)}
                  linkTo={prefixUrl(`/trace/${trace.traceID}`)}
                  toggleComparison={this.toggleComparison}
                  trace={trace}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}
