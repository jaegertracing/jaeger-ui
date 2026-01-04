// TODO: @ flow

// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback } from 'react';
import { Select } from 'antd';
import { Link } from 'react-router-dom';
import { Location, useNavigate } from 'react-router-dom-v5-compat';
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
import { stripEmbeddedState } from '../../../utils/embedded-url';

import { FetchedTrace } from '../../../types';
import { SearchQuery } from '../../../types/search';
import { TraceData } from '../../../types/trace';
import { IOtelTrace, StatusCode } from '../../../types/otel';

import './index.css';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';
import withRouteProps from '../../../utils/withRouteProps';
import SearchableSelect from '../../common/SearchableSelect';

type SearchResultsProps = {
  cohortAddTrace: (traceId: string) => void;
  cohortRemoveTrace: (traceId: string) => void;
  diffCohort: FetchedTrace[];
  disableComparisons: boolean;
  hideGraph: boolean;
  loading: boolean;
  location: Location;
  maxTraceDuration: number;
  queryOfResults?: SearchQuery;
  showStandaloneLink: boolean;
  skipMessage?: boolean;
  spanLinks?: Record<string, string> | undefined;
  traces: IOtelTrace[];
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
export function createBlob(rawTraces: TraceData[]) {
  return new Blob([`{"data":${JSON.stringify(rawTraces)}}`], { type: 'application/json' });
}

export function UnconnectedSearchResults({
  diffCohort,
  disableComparisons,
  hideGraph,
  loading,
  location,
  maxTraceDuration,
  queryOfResults,
  showStandaloneLink,
  skipMessage = false,
  spanLinks,
  traces,
  rawTraces,
  sortBy,
  handleSortChange,
  cohortAddTrace,
  cohortRemoveTrace,
}: SearchResultsProps) {
  const navigate = useNavigate();

  const toggleComparison = useCallback(
    (traceID: string, remove?: boolean) => {
      if (remove) {
        cohortRemoveTrace(traceID);
      } else {
        cohortAddTrace(traceID);
      }
    },
    [cohortAddTrace, cohortRemoveTrace]
  );

  const goToTrace = useCallback(
    (traceID: string) => {
      const searchUrl = queryOfResults ? getUrl(stripEmbeddedState(queryOfResults)) : getUrl();
      const locationObj = getLocation(traceID, { fromSearch: searchUrl });
      navigate(locationObj.pathname + (locationObj.search ? `?${locationObj.search}` : ''), {
        state: locationObj.state,
      });
    },
    [queryOfResults, navigate]
  );

  const onDdgViewClicked = useCallback(() => {
    const urlState = queryString.parse(location.search);
    const view = urlState.view && urlState.view === 'ddg' ? EAltViewActions.Traces : EAltViewActions.Ddg;
    trackAltView(view);
    navigate(getUrl({ ...urlState, view }));
  }, [location, navigate]);

  const onDownloadResultsClicked = useCallback(() => {
    const file = createBlob(rawTraces);
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `traces-${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
    element.remove();
  }, [rawTraces]);

  const traceResultsView = queryString.parse(location.search).view !== 'ddg';

  const diffSelection = !disableComparisons && (
    <DiffSelection toggleComparison={toggleComparison} traces={diffCohort} />
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
  return (
    <div className="SearchResults">
      <div className="SearchResults--header">
        {!hideGraph && traceResultsView && (
          <div className="ub-p3 SearchResults--headerScatterPlot">
            <ScatterPlot
              data={traces.map(t => {
                return {
                  x: t.startTimeUnixMicros,
                  y: t.durationMicros,
                  traceID: t.traceID,
                  size: t.spans.length,
                  name: t.traceName,
                  color: t.hasErrors() ? 'red' : '#12939A',
                  services: t.services || [],
                };
              })}
              onValueClick={(t: IOtelTrace) => {
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
          <SearchResultsDDG location={location as any} />
        </div>
      )}
      {traceResultsView && diffSelection}
      {traceResultsView && (
        <ul className="ub-list-reset">
          {traces.map(trace => (
            <li className="ub-my3" key={trace.traceID}>
              <ResultItem
                durationPercent={getPercentageOfDuration(trace.durationMicros, maxTraceDuration)}
                isInDiffCohort={cohortIds.has(trace.traceID)}
                linkTo={getLocation(
                  trace.traceID,
                  { fromSearch: searchUrl },
                  spanLinks && (spanLinks[trace.traceID] || spanLinks[trace.traceID.replace(/^0*/, '')])
                )}
                toggleComparison={toggleComparison}
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

export default withRouteProps(React.memo(UnconnectedSearchResults));
