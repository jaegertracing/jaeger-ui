// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Col, Divider, Row, Tag, Tooltip } from 'antd';
import { Link } from 'react-router-dom';

import dayjs from 'dayjs';

import { IoWarning } from 'react-icons/io5';

import { trackConversions, EAltViewActions } from './index.track';
import * as markers from './ResultItem.markers';
import ResultItemTitle from './ResultItemTitle';
import ServicePills from './ServicePills';
import { formatRelativeDate, formatRelativeTime } from '../../../utils/date';
import { getIncompleteTraceTooltip } from '../../../model/trace-viewer';

import type { TraceSummary } from '../../../types/trace-summary';
import type { TracePageLink } from '../../TracePage/url';

import './ResultItem.css';

type Props = {
  durationPercent: number;
  isInDiffCohort: boolean;
  isUploaded?: boolean;
  linkTo: TracePageLink;
  toggleComparison: (traceID: string) => void;
  traceSummary: TraceSummary;
  disableComparision: boolean;
};

const trackTraceConversions = () => trackConversions(EAltViewActions.Traces);

export default function ResultItem({
  durationPercent,
  isInDiffCohort,
  isUploaded,
  linkTo,
  toggleComparison,
  traceSummary,
  disableComparision,
}: Props) {
  const {
    duration,
    services = [],
    startTime,
    traceName,
    traceID,
    spanCount,
    errorSpanCount,
    warningSpanCount,
    orphanSpanCount,
  } = traceSummary;

  const timeStr = dayjs(startTime / 1000).format('h:mm:ss a');
  const fromNow = formatRelativeTime(startTime);

  return (
    <div className="ResultItem" onClick={trackTraceConversions} role="button">
      <ResultItemTitle
        duration={duration}
        durationPercent={durationPercent}
        isInDiffCohort={isInDiffCohort}
        linkTo={linkTo}
        toggleComparison={toggleComparison}
        traceID={traceID}
        traceName={traceName}
        disableComparision={disableComparision}
      />
      <Link to={{ pathname: linkTo.pathname, search: linkTo.search }} state={linkTo.state}>
        <Row>
          <Col xs={24} sm={4} className="ub-p2">
            {spanCount !== undefined && (
              <Tag className="ub-m1" data-testid={markers.NUM_SPANS} variant="outlined">
                {spanCount} Span{spanCount > 1 && 's'}
              </Tag>
            )}
            {Boolean(errorSpanCount) && (
              <Tag className="ub-m1" color="red" variant="outlined">
                {errorSpanCount} Error{(errorSpanCount ?? 0) > 1 && 's'}
              </Tag>
            )}
            {Boolean(warningSpanCount) && (
              <Tag className="ub-m1" color="warning" variant="outlined">
                {warningSpanCount} Warning{(warningSpanCount ?? 0) > 1 && 's'}
              </Tag>
            )}
            {Boolean(orphanSpanCount) && (
              <Tooltip title={getIncompleteTraceTooltip(orphanSpanCount ?? 0)}>
                <Tag className="ub-m1" color="orange">
                  <IoWarning className="ResultItem--warningIcon" />
                  Incomplete
                </Tag>
              </Tooltip>
            )}
            {isUploaded && (
              <Tag className="ub-m1" color="blue" variant="outlined">
                Uploaded
              </Tag>
            )}
          </Col>
          <Col xs={24} sm={16} className="ub-p2">
            <div data-testid={markers.SERVICE_TAGS}>
              <ServicePills services={services} />
            </div>
          </Col>
          <Col xs={24} sm={4} className="ub-p3 ub-tx-right-align">
            {formatRelativeDate(startTime / 1000)}
            <Divider vertical />
            {timeStr.slice(0, -3)}&nbsp;{timeStr.slice(-2)}
            <br />
            <small>{fromNow}</small>
          </Col>
        </Row>
      </Link>
    </div>
  );
}
