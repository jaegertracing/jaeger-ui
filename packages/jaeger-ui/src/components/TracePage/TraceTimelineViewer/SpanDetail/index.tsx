// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Divider } from 'antd';

import { IoLinkOutline } from 'react-icons/io5';
import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';
import AccordianReferences from './AccordianReferences';
import AccordianText from './AccordianText';
import DetailState from './DetailState';
import { formatDuration } from '../utils';
import CopyIcon from '../../../common/CopyIcon';
import LabeledList from '../../../common/LabeledList';

import { TNil } from '../../../../types';
import { Link } from '../../../../types/trace';
import { IOtelSpan, IAttribute, IEvent } from '../../../../types/otel';
import OtelSpanFacade from '../../../../model/OtelSpanFacade';

import './index.css';

type SpanDetailProps = {
  detailState: DetailState;
  linksGetter: ((links: ReadonlyArray<IAttribute>, index: number) => Link[]) | TNil;
  eventItemToggle: (spanID: string, event: IEvent) => void;
  eventsToggle: (spanID: string) => void;
  resourceToggle: (spanID: string) => void;
  span: IOtelSpan;
  attributesToggle: (spanID: string) => void;
  traceStartTime: number;
  warningsToggle: (spanID: string) => void;
  linksToggle: (spanID: string) => void;
  focusSpan: (uiFind: string) => void;
  currentViewRangeTime: [number, number];
  traceDuration: number;
  useOtelTerms?: boolean;
};

export default function SpanDetail(props: SpanDetailProps) {
  const {
    detailState,
    linksGetter,
    eventItemToggle,
    eventsToggle,
    resourceToggle,
    span,
    attributesToggle,
    traceStartTime,
    warningsToggle,
    linksToggle,
    focusSpan,
    currentViewRangeTime,
    traceDuration,
    useOtelTerms = false,
  } = props;

  const { isAttributesOpen, isResourceOpen, events: eventsState, isWarningsOpen, isLinksOpen } = detailState;
  const warnings = span.warnings;

  // Get legacy references from the facade for display in AccordianReferences
  // This is a temporary bridge until AccordianReferences is migrated to use OTEL links
  const legacyReferences = span instanceof OtelSpanFacade ? span.legacyReferences : [];

  // Display labels based on terminology flag
  const attributesLabel = useOtelTerms ? 'Attributes' : 'Tags';
  const resourceLabel = useOtelTerms ? 'Resource' : 'Process';
  const eventsLabel = useOtelTerms ? 'Events' : 'Logs';

  const overviewItems = [
    {
      key: 'svc',
      label: 'Service:',
      value: span.resource.serviceName,
    },
    {
      key: 'duration',
      label: 'Duration:',
      value: formatDuration(span.durationMicros),
    },
    {
      key: 'start',
      label: 'Start Time:',
      value: formatDuration(span.relativeStartTimeMicros),
    },
  ];
  const deepLinkCopyText = `${window.location.origin}${window.location.pathname}?uiFind=${span.spanId}`;

  return (
    <div>
      <div className="ub-flex ub-items-center">
        <h2 className="ub-flex-auto ub-m0">{span.name}</h2>
        <LabeledList
          className="ub-tx-right-align"
          dividerClassName="SpanDetail--divider"
          items={overviewItems}
        />
      </div>
      <Divider className="SpanDetail--divider ub-my1" />
      <div>
        <div>
          <AccordianKeyValues
            data={span.attributes}
            label={attributesLabel}
            linksGetter={linksGetter}
            isOpen={isAttributesOpen}
            onToggle={() => attributesToggle(span.spanId)}
          />
          {span.resource.attributes && span.resource.attributes.length > 0 && (
            <AccordianKeyValues
              className="ub-mb1"
              data={span.resource.attributes}
              label={resourceLabel}
              linksGetter={linksGetter}
              isOpen={isResourceOpen}
              onToggle={() => resourceToggle(span.spanId)}
            />
          )}
        </div>
        {span.events && span.events.length > 0 && (
          <AccordianLogs
            linksGetter={linksGetter}
            logs={span.events}
            isOpen={eventsState.isOpen}
            openedItems={eventsState.openedItems}
            onToggle={() => eventsToggle(span.spanId)}
            onItemToggle={eventItem => eventItemToggle(span.spanId, eventItem)}
            timestamp={traceStartTime}
            currentViewRangeTime={currentViewRangeTime}
            traceDuration={traceDuration}
            spanID={span.spanId}
            useOtelTerms={useOtelTerms}
          />
        )}
        {warnings && warnings.length > 0 && (
          <AccordianText
            className="AccordianWarnings"
            headerClassName="AccordianWarnings--header"
            label={<span className="AccordianWarnings--label">Warnings</span>}
            data={warnings}
            isOpen={isWarningsOpen}
            onToggle={() => warningsToggle(span.spanId)}
          />
        )}
        {legacyReferences &&
          legacyReferences.length > 0 &&
          (legacyReferences.length > 1 || legacyReferences[0].refType !== 'CHILD_OF') && (
            <AccordianReferences
              data={legacyReferences}
              isOpen={isLinksOpen}
              onToggle={() => linksToggle(span.spanId)}
              focusSpan={focusSpan}
            />
          )}
        <small className="SpanDetail--debugInfo">
          <span className="SpanDetail--debugLabel" data-label="SpanID:" /> {span.spanId}
          <CopyIcon
            copyText={deepLinkCopyText}
            icon={<IoLinkOutline />}
            placement="topRight"
            tooltipTitle="Copy deep link to this span"
            buttonText="Copy"
          />
        </small>
      </div>
    </div>
  );
}
