// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback, useMemo } from 'react';
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
import { useSearchResultsStore } from '../store.search-results';

type SearchResultsProps = {
  addTraceToCohort: (summary: TraceSummary) => void;
  removeTraceFromCohort: (traceId: string) => void;
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
  rawTraces: unknown[];
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
  addTraceToCohort,
  removeTraceFromCohort,
}: SearchResultsProps) {
  const navigate = useNavigate();
  const viewMode = useSearchResultsStore(s => s.viewMode);
  const setViewMode = useSearchResultsStore(s => s.setViewMode);

  const traceSummaryById = useMemo(
    () => new Map(traceSummaries.map(summary => [summary.traceID, summary])),
    [traceSummaries]
  );

  const toggleComparison = useCallback(
    (traceID: string, remove?: boolean) => {
      if (remove) {
        removeTraceFromCohort(traceID);
        return;
      }
      const summary = traceSummaryById.get(traceID);
      // Defensive: every rendered row's traceID is a key in traceSummaryById,
      // so this lookup cannot miss in normal UI flow.
      if (!summary) return;
      addTraceToCohort(summary);
    },
    [addTraceToCohort, removeTraceFromCohort, traceSummaryById]
  );

  const clearAllComparisons = useCallback(() => {
    diffCohort.forEach(t => removeTraceFromCohort(t.traceID));
  }, [diffCohort, removeTraceFromCohort]);

  const getLink = useCallback(
    (traceID: string) =>
      getTracePageLink(
        traceID,
        { fromSearch: location.pathname + location.search },
        spanLinks && (spanLinks[traceID] || spanLinks[traceID.replace(/^0*/, '')])
      ),
    [location, spanLinks]
  );

  const goToTrace = useCallback(
    (traceID: string) => {
      const searchUrl = location.pathname + location.search;
      const locationObj = getTracePageLink(traceID, { fromSearch: searchUrl });
      navigate(locationObj.pathname + (locationObj.search ? `?${locationObj.search}` : ''), {
        state: locationObj.state,
      });
    },
    [location, navigate]
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
    <DiffSelection
      toggleComparison={toggleComparison}
      traces={diffCohort}
      hideSelectedItems={viewMode === 'table'}
      onClearAll={clearAllComparisons}
    />
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
                  spanCount: t.spanCount ?? 0,
                  serviceCount: t.services.length,
                  name: t.traceName,
                  color: (t.errorSpanCount ?? 0) > 0 ? 'red' : '#12939A',
                };
              })}
              onValueClick={(t: { traceID: string }) => {
                goToTrace(t.traceID);
              }}
            />
          </div>
        )}
        <div className="SearchResults--headerOverview">
          <h2 className="ub-m0 u-flex-1 SearchResults--resultCount">
            {traceSummaries.length} Trace{traceSummaries.length > 1 && 's'}
          </h2>
          {traceResultsView && viewMode === 'list' && (
            <SelectSort sortBy={sortBy} handleSortChange={handleSortChange} />
          )}
          {traceResultsView && <DownloadResults traceSummaries={traceSummaries} rawTraces={rawTraces} />}
          <AltViewOptions traceResultsView={traceResultsView} onDdgViewClicked={onDdgViewClicked} />
          {traceResultsView && (
            <Radio.Group
              aria-label="Results view mode"
              value={viewMode}
              onChange={e => setViewMode(e.target.value as 'list' | 'table')}
            >
              <Radio.Button value="list">List</Radio.Button>
              <Radio.Button value="table">Table</Radio.Button>
            </Radio.Group>
          )}
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
          <SearchResultsDDG location={location} traceIDs={traceSummaries.map(s => s.traceID)} />
        </div>
      )}
      {traceResultsView && diffSelection}
      {traceResultsView && viewMode === 'table' && (
        <TraceTable
          traceSummaries={traceSummaries}
          maxTraceDuration={maxTraceDuration}
          getLink={getLink}
          sortBy={sortBy}
          handleSortChange={handleSortChange}
          disableComparisons={disableComparisons}
          cohortIds={cohortIds}
          toggleComparison={toggleComparison}
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
                linkTo={getLink(traceSummary.traceID)}
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
