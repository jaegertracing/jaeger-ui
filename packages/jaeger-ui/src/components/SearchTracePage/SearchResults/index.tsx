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
import { History as RouterHistory, Location } from 'history';
import { Link } from 'react-router-dom';
import queryString from 'query-string';

import AltViewOptions from './AltViewOptions';
import DownloadResults from './DownloadResults';
import DiffSelection from './DiffSelection';
import * as markers from './index.markers';
import { EAltViewActions, trackAltView } from './index.track';
import ResultItem from './ResultItem';
import ScatterPlot from './ScatterPlot';
import { getUrl } from '../url';
import LoadingIndicator from '../../common/LoadingIndicator';
import NewWindowIcon from '../../common/NewWindowIcon';
import SearchResultsDDG from '../../DeepDependencies/traces';
import { getLocation } from '../../TracePage/url';
import * as orderBy from '../../../model/order-by';
import { getPercentageOfDuration } from '../../../utils/date';
import { getTracePageHeaderParts } from '../../../model/trace-viewer';
import { stripEmbeddedState } from '../../../utils/embedded-url';

import { FetchedTrace } from '../../../types';
import { SearchQuery } from '../../../types/search';
import { KeyValuePair, Trace, TraceData } from '../../../types/trace';

import './index.css';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';
import withRouteProps from '../../../utils/withRouteProps';
import SearchableSelect from '../../common/SearchableSelect';

type SearchResultsProps = {
  cohortAddTrace: (traceId: string) => void;
  cohortRemoveTrace: (traceId: string) => void;
  diffCohort: FetchedTrace[];
  disableComparisons: boolean;
  goToTrace: (traceId: string) => void;
  hideGraph: boolean;
  history: RouterHistory;
  loading: boolean;
  location: Location;
  maxTraceDuration: number;
  queryOfResults?: SearchQuery;
  showStandaloneLink: boolean;
  skipMessage?: boolean;
  spanLinks?: Record<string, string> | undefined;
  traces: Trace[];
  rawTraces: TraceData[];
  sortBy: string;
  handleSortChange: (sortBy: string) => void;
};

type SelectSortProps = {
  sortBy: string;
  handleSortChange: (sortBy: string) => void;
};

const Option = Select.Option;
/**
 * Contains the dropdown to sort and filter trace search results
 */
export function SelectSort({ sortBy, handleSortChange }: SelectSortProps) {
  return (
    <label>
      Sort:{' '}
      <SearchableSelect value={sortBy} onChange={(value: string) => handleSortChange(value)}>
        <Option value={orderBy.MOST_RECENT}>Most Recent</Option>
        <Option value={orderBy.LONGEST_FIRST}>Longest First</Option>
        <Option value={orderBy.SHORTEST_FIRST}>Shortest First</Option>
        <Option value={orderBy.MOST_SPANS}>Most Spans</Option>
        <Option value={orderBy.LEAST_SPANS}>Least Spans</Option>
      </SearchableSelect>
    </label>
  );
}

// export for tests

/**
 * Pure function to add or remove trace from cohort based on flag.
 */
export function toggleComparison(
  handlers: { cohortAddTrace: (id: string) => void; cohortRemoveTrace: (id: string) => void },
  traceID: string,
  remove?: boolean
) {
  if (remove) {
    handlers.cohortRemoveTrace(traceID);
  } else {
    handlers.cohortAddTrace(traceID);
  }
}

export function createBlob(rawTraces: TraceData[]) {
  return new Blob([`{"data":${JSON.stringify(rawTraces)}}`], { type: 'application/json' });
}

export function UnconnectedSearchResults(props: SearchResultsProps) {
  const {
    cohortAddTrace,
    cohortRemoveTrace,
    diffCohort,
    disableComparisons,
    goToTrace,
    hideGraph,
    history,
    loading,
    location,
    maxTraceDuration,
    queryOfResults,
    showStandaloneLink,
    skipMessage = false,
    spanLinks = undefined,
    traces,
    sortBy,
    handleSortChange,
  } = props;

  // Use the extracted toggleComparison function within the component
  function onToggleComparison(traceID: string, remove?: boolean) {
    toggleComparison({ cohortAddTrace, cohortRemoveTrace }, traceID, remove);
  }

  const onDdgViewClicked = React.useCallback(() => {
    const urlState = queryString.parse(location.search);
    const view = urlState.view && urlState.view === 'ddg' ? EAltViewActions.Traces : EAltViewActions.Ddg;
    trackAltView(view);
    history.push(getUrl({ ...urlState, view }));
  }, [location, history]);

  const onDownloadResultsClicked = React.useCallback(() => {
    const file = createBlob(props.rawTraces);
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `traces-${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
    element.remove();
  }, [props.rawTraces]);

  const traceResultsView = queryString.parse(location.search).view !== 'ddg';
  const diffSelection = !disableComparisons && (
    <DiffSelection toggleComparison={onToggleComparison} traces={diffCohort} />
  );

  if (loading) {
    return (
      <React.Fragment key="loading">
        {diffCohort.length > 0 && diffSelection}
        <LoadingIndicator className="u-mt-vast" centered />
      </React.Fragment>
    );
  }
  if (!Array.isArray(traces) || !traces.length) {
    return (
      <React.Fragment key="no-results">
        {diffCohort.length > 0 && diffSelection}
        {!skipMessage && (
          <div className="u-simple-card" data-test={markers.NO_RESULTS}>
            No trace results. Try another query.
          </div>
        )}
      </React.Fragment>
    );
  }
  const cohortIds = new Set(diffCohort.map(datum => datum.id));
  const searchUrl = queryOfResults ? getUrl(stripEmbeddedState(queryOfResults)) : getUrl();
  const isErrorTag = ({ key, value }: KeyValuePair<string | boolean>) =>
    key === 'error' && (value === true || value === 'true');
  return (
    <div className="SearchResults">
      <div className="SearchResults--header">
        {!hideGraph && traceResultsView && (
          <div className="ub-p3 SearchResults--headerScatterPlot">
            <ScatterPlot
              data={traces.map(t => {
                const rootSpanInfo = t.spans && t.spans.length > 0 ? getTracePageHeaderParts(t.spans) : null;
                return {
                  x: t.startTime,
                  y: t.duration,
                  traceID: t.traceID,
                  size: t.spans.length,
                  name: t.traceName,
                  color: t.spans.some(sp => sp.tags.some(isErrorTag)) ? 'red' : '#12939A',
                  services: t.services || [],
                  rootSpanName: rootSpanInfo?.operationName || 'Unknown',
                };
              })}
              onValueClick={(t: Trace) => {
                goToTrace(t.traceID);
              }}
            />
          </div>
        )}
        <div className="SearchResults--headerOverview">
          <h2 className="ub-m0 u-flex-1">
            {traces.length} Trace{traces.length > 1 && 's'}
          </h2>
          {traceResultsView && <SelectSort sortBy={sortBy} handleSortChange={handleSortChange} />}
          {traceResultsView && <DownloadResults onDownloadResultsClicked={onDownloadResultsClicked} />}
          <AltViewOptions traceResultsView={traceResultsView} onDdgViewClicked={onDdgViewClicked} />
          {showStandaloneLink && (
            <Link
              className="u-tx-inherit ub-nowrap ub-ml3"
              to={searchUrl}
              target={getTargetEmptyOrBlank()}
              rel="noopener noreferrer"
            >
              <NewWindowIcon isLarge />
            </Link>
          )}
        </div>
      </div>
      {!traceResultsView && (
        <div className="SearchResults--ddg-container">
          <SearchResultsDDG location={location} history={history} />
        </div>
      )}
      {traceResultsView && diffSelection}
      {traceResultsView && (
        <ul className="ub-list-reset">
          {traces.map(trace => (
            <li className="ub-my3" key={trace.traceID}>
              <ResultItem
                durationPercent={getPercentageOfDuration(trace.duration, maxTraceDuration)}
                isInDiffCohort={cohortIds.has(trace.traceID)}
                linkTo={getLocation(
                  trace.traceID,
                  { fromSearch: searchUrl },
                  spanLinks && (spanLinks[trace.traceID] || spanLinks[trace.traceID.replace(/^0*/, '')])
                )}
                toggleComparison={onToggleComparison}
                trace={trace}
                disableComparision={disableComparisons}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default withRouteProps(UnconnectedSearchResults);
