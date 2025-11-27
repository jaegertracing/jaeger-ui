// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Col, Divider, Row, Tag } from 'antd';
import { LocationDescriptor } from 'history';
import { Link } from 'react-router-dom';

import _sortBy from 'lodash/sortBy';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { IoAlert } from 'react-icons/io5';

import { trackConversions, EAltViewActions } from './index.track';
import * as markers from './ResultItem.markers';
import ResultItemTitle from './ResultItemTitle';
import colorGenerator from '../../../utils/color-generator';
import { formatRelativeDate } from '../../../utils/date';

import { KeyValuePair, Trace } from '../../../types/trace';

import './ResultItem.css';

dayjs.extend(relativeTime);

type Props = {
  durationPercent: number;
  isInDiffCohort: boolean;
  linkTo: LocationDescriptor;
  toggleComparison: (traceID: string) => void;
  trace: Trace;
  disableComparision: boolean;
};

const isErrorTag = ({ key, value }: KeyValuePair<boolean | string>) =>
  key === 'error' && (value === true || value === 'true');
const trackTraceConversions = () => trackConversions(EAltViewActions.Traces);

export default function ResultItem({
  durationPercent,
  isInDiffCohort,
  linkTo,
  toggleComparison,
  trace,
  disableComparision,
}: Props) {
  const { duration, services = [], startTime, traceName, traceID, spans = [] } = trace;

  // Initialize state values
  const [erroredServices, setErroredServices] = React.useState<Set<string>>(new Set());
  const [numSpans] = React.useState(spans.length);
  const [numErredSpans, setNumErredSpans] = React.useState(0);
  const [timeStr, setTimeStr] = React.useState('');
  const [fromNow, setFromNow] = React.useState<string | boolean>('');

  React.useEffect(() => {
    const startTimeDayjs = dayjs(startTime / 1000);
    setTimeStr(startTimeDayjs.format('h:mm:ss a'));
    setFromNow(startTimeDayjs.fromNow());

    const errored = new Set<string>();
    const erredCount = spans.filter(sp => {
      const hasError = sp.tags.some(isErrorTag);
      if (hasError) errored.add(sp.process.serviceName);
      return hasError;
    }).length;

    setErroredServices(errored);
    setNumErredSpans(erredCount);
  }, [startTime, spans]);

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
      <Link to={linkTo}>
        <Row>
          <Col span={4} className="ub-p2">
            <Tag className="ub-m1" data-testid={markers.NUM_SPANS}>
              {numSpans} Span{numSpans > 1 && 's'}
            </Tag>
            {Boolean(numErredSpans) && (
              <Tag className="ub-m1" color="red">
                {numErredSpans} Error{numErredSpans > 1 && 's'}
              </Tag>
            )}
          </Col>
          <Col span={16} className="ub-p2">
            <ul className="ub-list-reset" data-testid={markers.SERVICE_TAGS}>
              {_sortBy(services, s => s.name).map(service => {
                const { name, numberOfSpans: count } = service;
                return (
                  <li key={name} className="ub-inline-block ub-m1">
                    <Tag
                      className="ResultItem--serviceTag"
                      style={{ borderLeftColor: colorGenerator.getColorByKey(name) }}
                    >
                      {erroredServices.has(name) && <IoAlert className="ResultItem--errorIcon" />}
                      {name} ({count})
                    </Tag>
                  </li>
                );
              })}
            </ul>
          </Col>
          <Col span={4} className="ub-p3 ub-tx-right-align">
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
