// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, InputRef, Tooltip } from 'antd';
import _maxBy from 'lodash/maxBy';
import { IoArrowBack, IoFileTrayFull, IoChevronForward, IoWarning } from 'react-icons/io5';
import { Link } from 'react-router-dom';

import DocumentTitle from '../../../utils/documentTitle';
import AltViewOptions from './AltViewOptions';
import SpanGraph from './SpanGraph';
import TraceViewSettings from './TraceViewSettings';
import TracePageSearchBar from './TracePageSearchBar';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate, ETraceViewType } from '../types';
import LabeledList from '../../common/LabeledList';
import NewWindowIcon from '../../common/NewWindowIcon';
import TraceName from '../../common/TraceName';
import { TNil } from '../../../types';
import { IOtelTrace } from '../../../types/otel';
import { formatDatetime, formatDuration } from '../../../utils/date';
import { getTraceLinks } from '../../../model/link-patterns';
import { getIncompleteTraceTooltip } from '../../../model/trace-viewer';

import './TracePageHeader.css';
import ExternalLinks from '../../common/ExternalLinks';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';
import TraceId from '../../common/TraceId';

type TracePageHeaderEmbedProps = {
  canCollapse: boolean;
  clearSearch: () => void;
  detailPanelMode: 'inline' | 'sidepanel';
  enableSidePanel: boolean;
  focusUiFindMatches: () => void;
  hideMap: boolean;
  hideSummary: boolean;
  linkToStandalone: string;
  nextResult: () => void;
  onArchiveClicked: () => void;
  onDetailPanelModeToggle: () => void;
  onSlimViewClicked: () => void;
  onTimelineToggle: () => void;
  onTraceViewChange: (viewType: ETraceViewType) => void;
  prevResult: () => void;
  resultCount: number;
  showArchiveButton: boolean;
  showStandaloneLink: boolean;
  disableJsonView: boolean;
  showViewOptions: boolean;
  slimView: boolean;
  textFilter: string | TNil;
  timelineBarsVisible: boolean;
  toSearch: string | null;
  trace: IOtelTrace;
  viewType: ETraceViewType;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  viewRange: IViewRange;
  useOtelTerms: boolean;
};

export const HEADER_ITEMS = [
  {
    key: 'timestamp',
    label: 'Trace Start',
    renderer: (trace: IOtelTrace) => {
      const dateStr = formatDatetime(trace.startTime);
      const match = dateStr.match(/^(.+)(\.\d+)$/);
      return match ? (
        <span className="TracePageHeader--overviewItem--value">
          {match[1]}
          <span className="TracePageHeader--overviewItem--valueDetail">{match[2]}</span>
        </span>
      ) : (
        dateStr
      );
    },
  },
  {
    key: 'duration',
    label: 'Duration',
    renderer: (trace: IOtelTrace) => formatDuration(trace.duration),
  },
  {
    key: 'service-count',
    label: 'Services',
    renderer: (trace: IOtelTrace) => trace.services.length,
  },
  {
    key: 'depth',
    label: 'Depth',
    renderer: (trace: IOtelTrace) => (_maxBy(trace.spans as any[], 'depth')?.depth ?? 0) + 1,
  },
  {
    key: 'span-count',
    label: 'Total Spans',
    renderer: (trace: IOtelTrace) => trace.spans.length,
  },
  {
    key: 'incomplete',
    label: null,
    renderer: (trace: IOtelTrace) => {
      const orphanCount = trace.orphanSpanCount ?? 0;
      if (orphanCount === 0) return null;
      const tooltipText = getIncompleteTraceTooltip(orphanCount);
      return (
        <Tooltip title={tooltipText}>
          <span className="TracePageHeader--incompleteTag">
            <IoWarning className="TracePageHeader--incompleteIcon" />
            Incomplete
          </span>
        </Tooltip>
      );
    },
  },
];

export function TracePageHeaderFn(props: TracePageHeaderEmbedProps & { forwardedRef: React.Ref<InputRef> }) {
  const {
    canCollapse,
    clearSearch,
    detailPanelMode,
    enableSidePanel,
    focusUiFindMatches,
    forwardedRef,
    hideMap,
    hideSummary,
    linkToStandalone,
    nextResult,
    onArchiveClicked,
    onDetailPanelModeToggle,
    onSlimViewClicked,
    onTimelineToggle,
    onTraceViewChange,
    prevResult,
    resultCount,
    showArchiveButton,
    showStandaloneLink,
    showViewOptions,
    disableJsonView,
    slimView,
    textFilter,
    timelineBarsVisible,
    toSearch,
    trace,
    viewType,
    updateNextViewRangeTime,
    updateViewRangeTime,
    viewRange,
    useOtelTerms,
  } = props;

  if (!trace) {
    return null;
  }

  const links = getTraceLinks(trace);

  const summaryItems =
    !hideSummary &&
    !slimView &&
    HEADER_ITEMS.map(item => {
      const { renderer, ...rest } = item;
      return { ...rest, value: renderer(trace) };
    }).filter(item => item.value !== null);

  const traceShortID = trace.traceID.slice(0, 7);

  const title = (
    <h1 className={`TracePageHeader--title ${canCollapse ? 'is-collapsible' : ''}`}>
      <TraceName traceName={trace.traceName} /> <TraceId traceId={trace.traceID} />
    </h1>
  );

  return (
    <header className="TracePageHeader">
      <DocumentTitle title={`${trace.traceEmoji} ${traceShortID}: ${trace.tracePageTitle} — Jaeger UI`} />
      <div className="TracePageHeader--titleRow">
        {toSearch && (
          <Link className="TracePageHeader--back" to={toSearch}>
            <IoArrowBack />
          </Link>
        )}
        {links && links.length > 0 && <ExternalLinks links={links} />}
        {canCollapse ? (
          <a
            className="TracePageHeader--titleLink"
            onClick={onSlimViewClicked}
            role="switch"
            aria-checked={!slimView}
          >
            <IoChevronForward className={`TracePageHeader--detailToggle ${!slimView ? 'is-expanded' : ''}`} />
            {title}
          </a>
        ) : (
          title
        )}
        <TracePageSearchBar
          clearSearch={clearSearch}
          focusUiFindMatches={focusUiFindMatches}
          nextResult={nextResult}
          prevResult={prevResult}
          ref={forwardedRef}
          resultCount={resultCount}
          textFilter={textFilter}
          navigable={viewType === ETraceViewType.TraceTimelineViewer}
          useOtelTerms={useOtelTerms}
        />
        <TraceViewSettings
          className="ub-m2"
          detailPanelMode={detailPanelMode}
          enableSidePanel={enableSidePanel}
          onDetailPanelModeToggle={onDetailPanelModeToggle}
          onTimelineToggle={onTimelineToggle}
          timelineBarsVisible={timelineBarsVisible}
        />
        {showViewOptions && (
          <AltViewOptions
            disableJsonView={disableJsonView}
            onTraceViewChange={onTraceViewChange}
            traceID={trace.traceID}
            viewType={viewType}
          />
        )}
        {showArchiveButton && (
          <Button className="ub-mr2 ub-flex ub-items-center" htmlType="button" onClick={onArchiveClicked}>
            <IoFileTrayFull className="TracePageHeader--archiveIcon" />
            Archive Trace
          </Button>
        )}
        {showStandaloneLink && (
          <Link
            className="u-tx-inherit ub-nowrap ub-mx2"
            to={linkToStandalone}
            target={getTargetEmptyOrBlank()}
            rel="noopener noreferrer"
          >
            <NewWindowIcon isLarge />
          </Link>
        )}
      </div>
      {summaryItems && <LabeledList className="TracePageHeader--overviewItems" items={summaryItems} />}
      {!hideMap && !slimView && (
        <SpanGraph
          trace={trace}
          viewRange={viewRange}
          updateNextViewRangeTime={updateNextViewRangeTime}
          updateViewRangeTime={updateViewRangeTime}
        />
      )}
    </header>
  );
}

export default React.forwardRef((props: TracePageHeaderEmbedProps, ref: React.Ref<InputRef>) => (
  <TracePageHeaderFn {...props} forwardedRef={ref} />
));
