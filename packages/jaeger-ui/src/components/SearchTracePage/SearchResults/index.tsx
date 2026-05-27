// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback } from 'react';
import { Radio, Select } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import queryString from 'query-string';

import AltViewOptions from './AltViewOptions';
import DownloadResults from './DownloadResults';
import DiffSelection from './DiffSelection';
import * as markers from './index.markers';
import { EAltViewActions, trackAltView } from './index.track';
import ResultItem from './ResultItem';
import ScatterPlot from './ScatterPlot';
import TraceTable from './TraceTable';
import { getUrl } from '../url';
import LoadingIndicator from '../../common/LoadingIndicator';
import NewWindowIcon from '../../common/NewWindowIcon';
import SearchResultsDDG from '../../DeepDependencies/traces';
import { getTracePageLink } from '../../TracePage/url';
import * as orderBy from '../../../model/order-by';
import { getPercentageOfDuration } from '../../../utils/date';

import { TraceSummary } from '../../../types/trace-summary';

import './index.css';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';
import withRouteProps from '../../../utils/withRouteProps';
import SearchableSelect from '../../common/SearchableSelect';

type SearchResultsProps = {
  cohortAddTrace: (traceId: string) => void;
  cohortRemoveTrace: (traceId: string) => void;
  diffCohort: TraceSummary[];
  disableComparisons: boolean;
  hideGraph: boolean;
  loading: boolean;
  location: Location;
  maxTraceDuration: number;
  showStandaloneLink: boolean;
  skipMessage?: boolean;
  spanLinks?: Record<string, string> | undefined;
  traceSummaries: TraceSummary[];
  uploadedTraceIDs: ReadonlySet<string>;
  rawTraces: any[];
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

export function UnconnectedSearchResults({
  diffCohort,
  disableComparisons,
  hideGraph,
  loading,
  location,
  maxTraceDuration,
  showStandaloneLink,
  skipMessage = false,
  spanLinks,
  traceSummaries,
  uploadedTraceIDs,
  rawTraces,
  sortBy,
  handleSortChange,
  cohortAddTrace,
  cohortRemoveTrace,
}: SearchResultsProps) {
  const navigate = useNavigate();
  // Intentionally local state: view mode resets on remount, matching the ephemeral nature of search results.
  const [viewMode, setViewMode] = React.useState<'list' | 'table'>('list');

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
    (traceID: string, spanLink?: string) => {
      const searchUrl = location.pathname + location.search;
      const locationObj = getTracePageLink(traceID, { fromSearch: searchUrl }, spanLink);
      navigate(locationObj.pathname + (locationObj.search ? `?${locationObj.search}` : ''), {
        state: locationObj.state,
      });
    },
    [location, navigate]
  );

  const goToTraceFromTable = useCallback(
    (traceID: string) => {
      const spanLink = spanLinks && (spanLinks[traceID] || spanLinks[traceID.replace(/^0*/, '')]);
      goToTrace(traceID, spanLink);
    },
    [goToTrace, spanLinks]
  );

  const onDdgViewClicked = useCallback(() => {
    const urlState = queryString.parse(location.search);
    const view = urlState.view && urlState.view === 'ddg' ? EAltViewActions.Traces : EAltViewActions.Ddg;
    trackAltView(view);
    // When URL has lost search params (e.g. after TopNav navigation to bare /search),
    // fall back to the root service of the first result so DDG can build the graph.
    const serviceFromUrl = typeof urlState.service === 'string' ? urlState.service : undefined;
    const service = serviceFromUrl ?? traceSummaries[0]?.rootServiceName;
    navigate(getUrl({ ...urlState, service, view }));
  }, [location, navigate, traceSummaries]);

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
  if (!Array.isArray(traceSummaries) || !traceSummaries.length) {
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
  const cohortIds = new Set(diffCohort.map(datum => datum.traceID));
  const searchUrl = location.pathname + location.search;
  return (
    <div className="SearchResults">
      <div className="SearchResults--header">
        {!hideGraph && traceResultsView && (
          <div className="ub-p3 SearchResults--headerScatterPlot">
            <ScatterPlot
              data={traceSummaries.map(t => {
                return {
                  x: t.startTime,
                  y: t.duration,
                  traceID: t.traceID,
                  spanCount: t.spanCount,
                  serviceCount: t.services.length,
                  name: t.traceName,
                  color: t.errorSpanCount > 0 ? 'red' : '#12939A',
                };
              })}
              onValueClick={(t: { traceID: string }) => {
                goToTrace(t.traceID);
              }}
            />
          </div>
        )}
        <div className="SearchResults--headerOverview">
          <h2 className="ub-m0 u-flex-1">
            {traceSummaries.length} Trace{traceSummaries.length > 1 && 's'}
          </h2>
          {traceResultsView && <SelectSort sortBy={sortBy} handleSortChange={handleSortChange} />}
          {traceResultsView && (
            <Radio.Group
              className="ub-ml2"
              value={viewMode}
              onChange={e => setViewMode(e.target.value as 'list' | 'table')}
              size="small"
            >
              <Radio.Button value="list">List</Radio.Button>
              <Radio.Button value="table">Table</Radio.Button>
            </Radio.Group>
          )}
          {traceResultsView && <DownloadResults traceSummaries={traceSummaries} rawTraces={rawTraces} />}
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
          <SearchResultsDDG location={location as any} traceIDs={traceSummaries.map(s => s.traceID)} />
        </div>
      )}
      {traceResultsView && diffSelection}
      {traceResultsView && viewMode === 'table' && (
        <TraceTable
          traceSummaries={traceSummaries}
          onRowClick={goToTraceFromTable}
          sortBy={sortBy}
          handleSortChange={handleSortChange}
        />
      )}
      {traceResultsView && viewMode === 'list' && (
        <ul className="ub-list-reset">
          {traceSummaries.map(traceSummary => (
            <li className="ub-my3" key={traceSummary.traceID}>
              <ResultItem
                durationPercent={getPercentageOfDuration(traceSummary.duration, maxTraceDuration)}
                isInDiffCohort={cohortIds.has(traceSummary.traceID)}
                isUploaded={uploadedTraceIDs.has(traceSummary.traceID)}
                linkTo={getTracePageLink(
                  traceSummary.traceID,
                  { fromSearch: searchUrl },
                  spanLinks &&
                    (spanLinks[traceSummary.traceID] || spanLinks[traceSummary.traceID.replace(/^0*/, '')])
                )}
                toggleComparison={toggleComparison}
                traceSummary={traceSummary}
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
