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
import { Button, Input, InputRef, Tooltip } from 'antd';
import { IoChevronDown, IoChevronUp, IoSearch, IoArrowBack } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import { Divider } from 'antd';
import TimezoneSelector from '../../common/TimezoneSelector';
import { useTimezone } from '../../../utils/timezone-context';

import * as markers from './TracePageSearchBar.markers';
import { trackSlimHeaderToggle } from './TracePageHeader.track';
import TracePageSearchBar from './TracePageSearchBar';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate, ETraceViewType } from '../types';
import LabeledList from '../../common/LabeledList';
import NewWindowIcon from '../../common/NewWindowIcon';
import TraceName from '../../common/TraceName';
import { getTraceName } from '../../../model/trace-viewer';
import { TNil } from '../../../types';
import { Trace } from '../../../types/trace';
import { formatDatetime, formatDuration } from '../../../utils/date';
import { getTraceLinks } from '../../../model/link-patterns';

import './TracePageHeader.css';
import AltViewOptions from './AltViewOptions';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import SpanGraph from './SpanGraph';

type TracePageHeaderEmbedProps = {
  canCollapse: boolean;
  clearSearch: () => void;
  focusUiFindMatches: () => void;
  hideMap: boolean;
  hideSummary: boolean;
  linkToStandalone: string;
  nextResult: () => void;
  onSlimViewClicked: () => void;
  prevResult: () => void;
  resultCount: number;
  showArchiveButton: boolean;
  showShortcutsHelp: boolean;
  showStandaloneLink: boolean;
  showViewOptions: boolean;
  slimView: boolean;
  textFilter: string | TNil;
  trace: Trace;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  viewRange: IViewRange;
  viewType: ETraceViewType;
  disableJsonView: boolean;
  onTraceViewChange: (viewType: ETraceViewType) => void;
  onArchiveClicked: () => void;
  toSearch: string | null;
  rerootedSpanID: string | null;
  clearReroot: () => void;
};

export type TracePageHeaderProps = TracePageHeaderEmbedProps & {
  forwardedRef: React.Ref<InputRef>;
};

export const TracePageHeaderFn = React.forwardRef<InputRef, TracePageHeaderEmbedProps>((props, ref) => {
  const { timezone } = useTimezone();
  const {
      canCollapse,
      clearSearch,
      clearReroot,
      disableJsonView,
      focusUiFindMatches,
            hideMap,
      hideSummary,
      linkToStandalone,
      nextResult,
      onArchiveClicked,
      onSlimViewClicked,
      onTraceViewChange,
      prevResult,
      resultCount,
      rerootedSpanID,
      showArchiveButton,
      showShortcutsHelp,
      showStandaloneLink,
      showViewOptions,
      slimView,
      textFilter,
      toSearch,
      trace,
      updateNextViewRangeTime,
      updateViewRangeTime,
      viewRange,
      viewType,
    } = props;

    if (!trace) {
      return null;
    }

    const links = getTraceLinks(trace);
    const summaryItems =
      !hideSummary &&
      [
        {
          key: 'start',
          label: 'Trace Start:',
          value: formatDatetime(trace.startTime, timezone),
        },
        {
          key: 'duration',
          label: 'Duration:',
          value: formatDuration(trace.duration),
        },
        {
          key: 'svc-count',
          label: 'Services:',
          value: new Set(trace.spans.map(span => span.process.serviceName)).size,
        },
        {
          key: 'depth',
          label: 'Depth:',
          value: trace.depth,
        },
        {
          key: 'span-count',
          label: 'Total Spans:',
          value: trace.spans.length,
        },
        ...(links
          ? links.map((link, i) => ({
              key: `link-${i}`,
              label: link.key,
              value: (
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.text}
                </a>
              ),
            }))
          : []),
      ];

    const title = (
      <h1 className={`TracePageHeader--title ${canCollapse ? 'is-collapsible' : ''}`}>
        <TraceName traceName={getTraceName(trace.spans)} />{' '}
        <small className="u-tx-muted">{trace.traceID.slice(0, 7)}</small>
        {rerootedSpanID && (
          <Button
            className="TracePageHeader--rerootButton"
            onClick={clearReroot}
            type="primary"
            size="small"
            icon={<IoArrowBack />}
          >
            Back to Full Trace
          </Button>
        )}
      </h1>
    );

    return (
      <header className="TracePageHeader">
        <div className="TracePageHeader--titleRow">
          {canCollapse && (
            <Button
              className="TracePageHeader--titleToggleViewButton"
              onClick={onSlimViewClicked}
              type="text"
              icon={slimView ? <IoChevronDown /> : <IoChevronUp />}
            />
          )}
          {title}
          <TracePageSearchBar
            clearSearch={clearSearch}
            focusUiFindMatches={focusUiFindMatches}
            nextResult={nextResult}
            prevResult={prevResult}
            ref={ref}
            resultCount={resultCount}
            textFilter={textFilter}
            navigable={viewType === ETraceViewType.TraceTimelineViewer}
          />
          {showShortcutsHelp && <KeyboardShortcutsHelp className="ub-mr2" />}
          {showViewOptions && (
            <AltViewOptions
              disableJsonView={disableJsonView}
              onTraceViewChange={onTraceViewChange}
              traceID={trace.traceID}
              viewType={viewType}
            />
          )}
          {showArchiveButton && (
            <Button className="ub-mr2 ub-flex ub-items-center" onClick={onArchiveClicked}>
              <IoSearch className="TracePageHeader--archiveIcon" />
              <span className="TracePageHeader--archiveButtonText">Archive Trace</span>
            </Button>
          )}
          {showStandaloneLink && (
            <Link
              className="ub-mr2 ub-flex ub-items-center"
              to={linkToStandalone}
              target="_blank"
              rel="noopener noreferrer"
            >
              <NewWindowIcon />
            </Link>
          )}
          {toSearch && (
            <Link className="u-tx-inherit ub-mx2" to={toSearch}>
              <Button className="ub-mr2 ub-flex ub-items-center">
                <IoArrowBack className="TracePageHeader--backIcon" />
                <span className="TracePageHeader--backToResultsText">Back to Results</span>
              </Button>
            </Link>
          )}
        </div>
        {summaryItems && !slimView && (
          <div className="TracePageHeader--overviewItemsWrapper">
            <LabeledList
              className="TracePageHeader--overviewItems"
              dividerClassName="TracePageHeader--overviewItemsDivider"
              items={summaryItems}
            />
            <TimezoneSelector />
          </div>
        )}
        {!hideMap && !slimView && (
          <SpanGraph
            trace={trace}
            viewRange={viewRange}
            updateNextViewRangeTime={updateNextViewRangeTime}
            updateViewRangeTime={updateViewRangeTime}
          />
        )}
        {!slimView && <Divider className="ub-my0" />}
      </header>
    );
  });

export default TracePageHeaderFn;;