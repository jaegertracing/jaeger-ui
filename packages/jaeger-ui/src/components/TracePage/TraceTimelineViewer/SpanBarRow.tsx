// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback } from 'react';
import { Tooltip } from 'antd';
import { IoAlert, IoGitNetwork, IoCloudUploadOutline, IoArrowForward } from 'react-icons/io5';
import { RECORDED_TREE, VisibleTree } from './generateRowStates';
import ReferencesButton from './ReferencesButton';
import TimelineRow from './TimelineRow';
import { formatDurationCompact, ViewedBoundsFunctionType } from './utils';
import SpanTreeOffset from './SpanTreeOffset';
import SpanBar from './SpanBar';
import { SpanDecorationIcon } from './SpanDecorationIcon';
import Ticks from './Ticks';
import SpanRowControls from './SpanRowControls';

import { TNil } from '../../../types';
import colorGenerator from '../../../utils/color-generator';
import { CriticalPathSection } from '../../../types/critical_path';
import { IOtelSpan } from '../../../types/otel';
import { SpanPill } from './spanPills';
import { getSpanDecorationIcon, getSpanPillsForSpan } from './spanDecorations';

import './SpanBarRow.css';

type SpanBarRowProps = {
  className?: string;
  color: string;
  criticalPath: CriticalPathSection[];
  nameColumnWidth: number;
  isChildrenExpanded: boolean;
  isDetailExpanded: boolean;
  isMatchingFilter: boolean;
  isSelected?: boolean;
  timelineBarsVisible: boolean;
  onDetailToggled: (spanID: string) => void;
  onChildrenToggled: (spanID: string) => void;
  numTicks: number;
  rpc?:
    | {
        viewStart: number;
        viewEnd: number;
        color: string;
        operationName: string;
        serviceName: string;
      }
    | TNil;
  noInstrumentedServer?:
    | {
        color: string;
        serviceName: string;
      }
    | TNil;
  hasOwnError: boolean;
  hasChildError: boolean;
  getViewedBounds: ViewedBoundsFunctionType;
  traceStartTime: number;
  span: IOtelSpan;
  focusSpan: (spanID: string) => void;
  traceDuration: number;
  spanPillsEnabled?: boolean;
  useOtelTerms: boolean;
  // The tree the rows draw; it differs from the span tree when the filter lifts children.
  tree?: VisibleTree;
};

// Hover text on the connector glyph and the hidden-errors badge names this many spans at most.
export const TOOLTIP_SPAN_LIMIT = 6;

/** The body of such a tooltip: a heading and the first few spans, one per line as "service::operation". */
export function SpanListTooltip({ heading, spans }: { heading: string; spans: ReadonlyArray<IOtelSpan> }) {
  const shown = spans.slice(0, TOOLTIP_SPAN_LIMIT);
  const rest = spans.length - shown.length;
  return (
    <div className="SpanBarRow--spanList">
      {heading}
      <ul>
        {shown.map((s, i) => (
          <li key={`${s.spanID}-${i}`}>
            {s.resource.serviceName}::{s.name}
          </li>
        ))}
        {rest > 0 && <li className="SpanBarRow--spanListMore">and {rest} more</li>}
      </ul>
    </div>
  );
}

/**
 * This was originally a stateless function, but changing to a PureComponent
 * reduced the render time of expanding a span row detail by ~50%. This is
 * even true in the case where the stateless function has the same prop types as
 * this class and arrow functions are created in the stateless function as
 * handlers to the onClick props. E.g. for now, the PureComponent is more
 * performance than the stateless function.
 */
const SpanBarRow: React.FC<SpanBarRowProps> = ({
  className = '',
  color,
  criticalPath,
  nameColumnWidth,
  isChildrenExpanded,
  isDetailExpanded,
  isMatchingFilter,
  isSelected,
  timelineBarsVisible,
  numTicks,
  rpc = null,
  noInstrumentedServer,
  hasOwnError,
  hasChildError,
  getViewedBounds,
  traceStartTime,
  span,
  focusSpan,
  traceDuration,
  spanPillsEnabled,
  onDetailToggled,
  onChildrenToggled,
  useOtelTerms,
  tree = RECORDED_TREE,
}) => {
  const _detailToggle = useCallback(() => {
    onDetailToggled(span.spanID);
  }, [onDetailToggled, span.spanID]);

  const _childrenToggle = useCallback(() => {
    onChildrenToggled(span.spanID);
  }, [onChildrenToggled, span.spanID]);

  const _detailToggleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDetailToggled(span.spanID);
      }
    },
    [onDetailToggled, span.spanID]
  );
  const {
    duration,
    name: operationName,
    resource: { serviceName },
  } = span;
  const isParent = tree.childCount(span) > 0;
  const liftedPast = tree.liftedPast(span);
  const hiddenErrors = tree.hiddenErrors(span);
  const pills = spanPillsEnabled ? getSpanPillsForSpan(span) : [];
  // One resolver for namespace + GenAI icons; GenAI wins when both match (#4217).
  const decoration = getSpanDecorationIcon(span);
  const label = formatDurationCompact(duration);
  const viewBounds = getViewedBounds(span.startTime, span.endTime);
  const viewStart = viewBounds.start;
  const viewEnd = viewBounds.end;

  const labelDetail = `${serviceName}::${operationName}`;
  let longLabel;
  let hintSide;
  if (viewStart > 1 - viewEnd) {
    longLabel = `${labelDetail} | ${label}`;
    hintSide = 'left';
  } else {
    longLabel = `${label} | ${labelDetail}`;
    hintSide = 'right';
  }

  // In OTEL model, links are used for "related" spans (not parent spans).
  // Show the references button if there's at least one link.
  const hasLinks = span.links && span.links.length > 0;
  const hasInboundLinks = span.inboundLinks && span.inboundLinks.length > 0;

  return (
    <TimelineRow
      className={`
          span-row
          ${className || ''}
          ${isDetailExpanded ? 'is-expanded' : ''}
          ${isMatchingFilter ? 'is-matching-filter' : ''}
          ${isSelected ? 'is-selected' : ''}
        `}
    >
      <TimelineRow.Cell className="span-name-column" width={nameColumnWidth}>
        <div className={`span-name-wrapper ${isMatchingFilter ? 'is-matching-filter' : ''}`}>
          <SpanTreeOffset
            childrenVisible={isChildrenExpanded}
            span={span}
            tree={tree}
            onClick={isParent ? _childrenToggle : undefined}
            // The tree markers stay on the service color, like the indent guides, even when the
            // bar takes a heatmap color.
            color={colorGenerator.getColorByKey(span.resource.serviceName)}
          />
          <a
            className={`span-name ${isDetailExpanded ? 'is-detail-expanded' : ''}`}
            aria-checked={isDetailExpanded}
            onClick={_detailToggle}
            onKeyDown={_detailToggleKeyDown}
            role="switch"
            style={{ borderColor: color }}
            tabIndex={0}
          >
            <span
              className={`span-svc-name ${isParent && !isChildrenExpanded ? 'is-children-collapsed' : ''}`}
            >
              {liftedPast.length > 0 && (
                <Tooltip
                  mouseEnterDelay={0}
                  rootClassName="SpanBarRow--spanListTip"
                  title={
                    <SpanListTooltip
                      heading={`Lifted past ${liftedPast.length} hidden ${liftedPast.length === 1 ? 'span' : 'spans'}`}
                      spans={liftedPast}
                    />
                  }
                >
                  <span className="SpanBarRow--liftedGlyph" data-testid="lifted-glyph">
                    ⤷
                  </span>
                </Tooltip>
              )}
              {decoration && <SpanDecorationIcon decoration={decoration} />}
              {hasOwnError && <IoAlert className="SpanBarRow--errorIcon" />}
              {!hasOwnError && hasChildError && (
                <IoAlert className="SpanBarRow--errorIcon SpanBarRow--errorIcon--hollow" />
              )}
              {serviceName}{' '}
              {rpc && (
                <span>
                  <IoArrowForward className="SpanBarRow--arrowForwardIcon" />{' '}
                  <i className="SpanBarRow--rpcColorMarker" style={{ background: rpc.color }} />
                  {rpc.serviceName}
                </span>
              )}
              {noInstrumentedServer && (
                <span>
                  <IoArrowForward className="SpanBarRow--arrowForwardIcon" />{' '}
                  <i
                    className="SpanBarRow--rpcColorMarker"
                    style={{ background: noInstrumentedServer.color }}
                  />
                  {noInstrumentedServer.serviceName}
                </span>
              )}
            </span>
            <small className="endpoint-name">{rpc ? rpc.operationName : operationName}</small>
            {pills.map(pill => (
              <SpanPill key={pill.label} pill={pill} />
            ))}
            {hiddenErrors.length > 0 && (
              <Tooltip
                mouseEnterDelay={0}
                rootClassName="SpanBarRow--spanListTip"
                title={<SpanListTooltip heading="Hidden spans with errors" spans={hiddenErrors} />}
              >
                <span className="SpanBarRow--hiddenErrors" data-testid="hidden-errors">
                  <IoAlert className="SpanBarRow--errorIcon SpanBarRow--errorIcon--hollow" />
                  {hiddenErrors.length} hidden {hiddenErrors.length === 1 ? 'error' : 'errors'}
                </span>
              </Tooltip>
            )}
          </a>
          {hasLinks && (
            <ReferencesButton
              links={span.links}
              tooltipText={useOtelTerms ? 'Contains multiple links' : 'Contains multiple references'}
              focusSpan={focusSpan}
            >
              <IoGitNetwork />
            </ReferencesButton>
          )}
          {hasInboundLinks && (
            <ReferencesButton
              links={span.inboundLinks}
              tooltipText={
                (useOtelTerms ? 'This span is linked from ' : 'This span is referenced by ') +
                (span.inboundLinks.length === 1 ? 'another span' : 'multiple other spans')
              }
              focusSpan={focusSpan}
            >
              <IoCloudUploadOutline />
            </ReferencesButton>
          )}
          <SpanRowControls span={span} />
        </div>
      </TimelineRow.Cell>
      {timelineBarsVisible && (
        <TimelineRow.Cell
          className="span-view"
          style={{ cursor: 'pointer' }}
          width={1 - nameColumnWidth}
          onClick={_detailToggle}
        >
          <Ticks numTicks={numTicks} />
          <SpanBar
            criticalPath={criticalPath}
            rpc={rpc}
            viewStart={viewStart}
            viewEnd={viewEnd}
            getViewedBounds={getViewedBounds}
            color={color}
            shortLabel={label}
            longLabel={longLabel}
            hintSide={hintSide}
            traceStartTime={traceStartTime}
            span={span}
            traceDuration={traceDuration}
            useOtelTerms={useOtelTerms}
          />
        </TimelineRow.Cell>
      )}
    </TimelineRow>
  );
};

export default React.memo(SpanBarRow);
