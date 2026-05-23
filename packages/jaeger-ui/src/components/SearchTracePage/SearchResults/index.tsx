// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback, useState } from 'react';
import { Select } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import queryString from 'query-string';

import JaegerAPI from '../../../api/jaeger';
import { pooledMap } from '../../../utils/pooledMap';
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
import { getTracePageLink } from '../../TracePage/url';
import * as orderBy from '../../../model/order-by';
import { getPercentageOfDuration } from '../../../utils/date';
import { stripEmbeddedState } from '../../../utils/embedded-url';

import { SearchQuery } from '../../../types/search';
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
  queryOfResults?: SearchQuery;
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

const getStripCircular = () => {
  const cache = new Set();
  return function (this: any, key: string, value: any) {
    if (
      key === 'childSpans' ||
      key === 'process' ||
      key === 'span' ||
      key === 'subsidiarilyReferencedBy' ||
      key === '_otelFacade' ||
      key === 'traceName' ||
      key === 'tracePageTitle' ||
      key === 'traceEmoji' ||
      key === 'services' ||
      key === 'spanMap' ||
      key === 'rootSpans' ||
      key === 'orphanSpanCount' ||
      key === 'endTime' ||
      key === 'depth' ||
      key === 'hasChildren' ||
      key === 'relativeStartTime'
    ) {
      return;
    }
    // We need to strip duration and startTime from TraceData but not from SpanData.
    // The TraceData object can be recognized by the presence of 'processes' field.
    if ((key === 'duration' || key === 'startTime') && this.processes) {
      return;
    }

    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.add(value);
    }
    return value;
  };
};

export function createBlob(rawTraces: any[]) {
  const stringified = JSON.stringify(rawTraces, getStripCircular());
  return new Blob([`{"data":${stringified}}`], { type: 'application/json' });
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
  traceSummaries,
  uploadedTraceIDs,
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
      const searchUrl = queryOfResults
        ? getUrl(stripEmbeddedState(queryOfResults))
        : location.pathname + location.search;
      const locationObj = getTracePageLink(traceID, { fromSearch: searchUrl });
      navigate(locationObj.pathname + (locationObj.search ? `?${locationObj.search}` : ''), {
        state: locationObj.state,
      });
    },
    [queryOfResults, location, navigate]
  );

  const onDdgViewClicked = useCallback(() => {
    const urlState = queryString.parse(location.search);
    const view = urlState.view && urlState.view === 'ddg' ? EAltViewActions.Traces : EAltViewActions.Ddg;
    trackAltView(view);
    navigate(getUrl({ ...urlState, view }));
  }, [location, navigate]);

  // undefined = not downloading; 0–1 = fraction of traces fetched so far
  const [downloadProgress, setDownloadProgress] = useState<number | undefined>(undefined);

  const onDownloadResultsClicked = useCallback(async () => {
    let traces = rawTraces;
    if (traces.length === 0 && traceSummaries.length > 0) {
      // API-only results: fetch with bounded concurrency so we report progress as responses
      // arrive without overwhelming the backend. Cap at 6 — the HTTP/1.1 per-host limit,
      // and a safe fanout for any Jaeger deployment regardless of HTTP version.
      setDownloadProgress(0);
      try {
        traces = await pooledMap(
          traceSummaries,
          async s => {
            const r = await JaegerAPI.fetchTrace(s.traceID);
            return r?.data?.[0] ?? r;
          },
          6,
          (done, total) => setDownloadProgress(done / total)
        );
      } finally {
        setDownloadProgress(undefined);
      }
    }
    const file = createBlob(traces);
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `traces-${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
    element.remove();
  }, [rawTraces, traceSummaries]);

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
  // When there are no API search params (upload-only), use the current URL as the back
  // target so the Back button on the trace page returns here rather than the empty homepage.
  const searchUrl = queryOfResults
    ? getUrl(stripEmbeddedState(queryOfResults))
    : location.pathname + location.search;
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
            <DownloadResults
              progress={downloadProgress}
              onDownloadResultsClicked={onDownloadResultsClicked}
            />
          )}
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
