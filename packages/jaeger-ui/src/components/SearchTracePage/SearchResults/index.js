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
import { Link } from 'react-router-dom';
import { Field, reduxForm, formValueSelector } from 'redux-form';
import memoizeOne from 'memoize-one';

import DiffSelection from './DiffSelection';
import * as markers from './index.markers';
import ResultItem from './ResultItem';
import ScatterPlot from './ScatterPlot';
import { getUrl } from '../url';
import LoadingIndicator from '../../common/LoadingIndicator';
import NewWindowIcon from '../../common/NewWindowIcon';
import { getLocation } from '../../TracePage/url';
import * as orderBy from '../../../model/order-by';
import { getPercentageOfDuration } from '../../../utils/date';
import { stripEmbeddedState } from '../../../utils/embedded-url';
import reduxFormFieldAdapter from '../../../utils/redux-form-field-adapter';

import type { FetchedTrace } from '../../../types';
import type { SearchQuery } from '../../../types/search';

import './index.css';
import ListView from '../../common/ListView';

type SearchResultsProps = {
  cohortAddTrace: string => void,
  cohortRemoveTrace: string => void,
  diffCohort: FetchedTrace[],
  disableComparisons: boolean,
  goToTrace: string => void,
  hideGraph: boolean,
  loading: boolean,
  maxTraceDuration: number,
  queryOfResults: SearchQuery,
  showStandaloneLink: boolean,
  skipMessage?: boolean,
  traces: TraceSummary[],
};

const Option = Select.Option;

/**
 * Contains the dropdown to sort and filter trace search results
 */
function SelectSortImpl() {
  return (
    <label>
      Sort:{' '}
      <Field name="sortBy" component={reduxFormFieldAdapter({ AntInputComponent: Select })}>
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
  static defaultProps = { skipMessage: false };

  searchUrl = memoizeOne(queryOfResults => getUrl(stripEmbeddedState(queryOfResults)));
  cohortIds = memoizeOne(diffCohort => new Set(diffCohort.map(datum => datum.id)));

  toggleComparison = (traceID: string, remove: boolean) => {
    const { cohortAddTrace, cohortRemoveTrace } = this.props;
    if (remove) {
      cohortRemoveTrace(traceID);
    } else {
      cohortAddTrace(traceID);
    }
  };

  getKeyFromIndex = (index: number) => this.props.traces[index].traceID;

  getIndexFromKey = (key: string) => {
    const size = this.props.traces.length;
    for (let i = 0; i < size; ++i) {
      if (this.props.traces[i].traceID === key) {
        return i;
      }
    }
    return -1;
  };

  renderRow = (key: string, style: Style, index: number, attrs: {}) => {
    const trace = this.props.traces[index];
    const { disableComparisons, maxTraceDuration, queryOfResults, diffCohort } = this.props;

    return (
      <div className="u-width-100" key={key} style={style} {...attrs}>
        <ResultItem
          durationPercent={getPercentageOfDuration(trace.duration, maxTraceDuration)}
          isInDiffCohort={this.cohortIds(diffCohort).has(trace.traceID)}
          linkTo={getLocation(trace.traceID, { fromSearch: this.searchUrl(queryOfResults) })}
          toggleComparison={this.toggleComparison}
          trace={trace}
          disableComparision={disableComparisons}
        />
      </div>
    );
  };

  render() {
    const {
      diffCohort,
      disableComparisons,
      goToTrace,
      hideGraph,
      loading,
      queryOfResults,
      showStandaloneLink,
      skipMessage,
      traces,
    } = this.props;
    const diffSelection = !disableComparisons && (
      <DiffSelection toggleComparison={this.toggleComparison} traces={diffCohort} />
    );
    if (loading) {
      return (
        <React.Fragment>
          {diffCohort.length > 0 && diffSelection}
          <LoadingIndicator className="u-mt-vast" centered />
        </React.Fragment>
      );
    }
    if (!Array.isArray(traces) || !traces.length) {
      return (
        <React.Fragment>
          {diffCohort.length > 0 && diffSelection}
          {!skipMessage && (
            <div className="u-simple-card" data-test={markers.NO_RESULTS}>
              No trace results. Try another query.
            </div>
          )}
        </React.Fragment>
      );
    }

    const searchUrl = getUrl(stripEmbeddedState(queryOfResults));
    return (
      <div>
        <div>
          <div className="SearchResults--header">
            {!hideGraph && (
              <div className="ub-p3">
                <ScatterPlot
                  data={traces.map(t => ({
                    x: t.startTime,
                    y: t.duration,
                    traceID: t.traceID,
                    size: t.spans.length,
                    name: t.traceName,
                  }))}
                  onValueClick={t => {
                    goToTrace(t.traceID);
                  }}
                />
              </div>
            )}
            <div className="SearchResults--headerOverview">
              <h2 className="ub-m0 u-flex-1">
                {traces.length} Trace{traces.length > 1 && 's'}
              </h2>
              <SelectSort />
              {showStandaloneLink && (
                <Link
                  className="u-tx-inherit ub-nowrap ub-ml3"
                  to={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <NewWindowIcon isLarge />
                </Link>
              )}
            </div>
          </div>
        </div>
        <div>
          {diffSelection}
          <ListView
            dataLength={this.props.traces.length}
            itemHeightGetter={() => 155}
            itemRenderer={this.renderRow}
            viewBuffer={20}
            viewBufferMin={10}
            initialDraw={40}
            itemsWrapperClassName="u-width-100"
            getKeyFromIndex={this.getKeyFromIndex}
            getIndexFromKey={this.getIndexFromKey}
            windowScroller
          />
        </div>
      </div>
    );
  }
}
