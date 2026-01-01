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
import { KeyValuePair, Link, Log, Span } from '../../../../types/trace';
import { IOtelSpan, IAttribute, IEvent } from '../../../../types/otel';
import OtelSpanFacade from '../../../../model/OtelSpanFacade';

import './index.css';

type SpanDetailProps = {
  detailState: DetailState;
  linksGetter: ((links: ReadonlyArray<KeyValuePair | IAttribute>, index: number) => Link[]) | TNil;
  logItemToggle: (spanID: string, log: Log | IEvent) => void;
  logsToggle: (spanID: string) => void;
  processToggle: (spanID: string) => void;
  span: Span;
  tagsToggle: (spanID: string) => void;
  traceStartTime: number;
  warningsToggle: (spanID: string) => void;
  referencesToggle: (spanID: string) => void;
  focusSpan: (uiFind: string) => void;
  currentViewRangeTime: [number, number];
  traceDuration: number;
  useOtelTerms?: boolean;
};

export default function SpanDetail(props: SpanDetailProps) {
  const {
    detailState,
    linksGetter,
    logItemToggle,
    logsToggle,
    processToggle,
    span,
    tagsToggle,
    traceStartTime,
    warningsToggle,
    referencesToggle,
    focusSpan,
    currentViewRangeTime,
    traceDuration,
    useOtelTerms = false,
  } = props;

  // Create OTEL facade wrapper
  const otelSpan: IOtelSpan = React.useMemo(() => new OtelSpanFacade(span), [span]);

  const { isTagsOpen, isProcessOpen, logs: logsState, isWarningsOpen, isReferencesOpen } = detailState;
  const { operationName, process, duration, relativeStartTime, spanID, logs, tags, warnings, references } =
    span;

  // Use OTEL terminology when flag is enabled
  const tagsLabel = useOtelTerms ? 'Attributes' : 'Tags';
  const processLabel = useOtelTerms ? 'Resource' : 'Process';
  const logsLabel = useOtelTerms ? 'Events' : 'Logs';

  const overviewItems = [
    {
      key: 'svc',
      label: 'Service:',
      value: otelSpan.resource.serviceName,
    },
    {
      key: 'duration',
      label: 'Duration:',
      value: formatDuration(otelSpan.durationMicros),
    },
    {
      key: 'start',
      label: 'Start Time:',
      value: formatDuration(otelSpan.relativeStartTimeMicros),
    },
  ];
  const deepLinkCopyText = `${window.location.origin}${window.location.pathname}?uiFind=${otelSpan.spanId}`;

  return (
    <div>
      <div className="ub-flex ub-items-center">
        <h2 className="ub-flex-auto ub-m0">{otelSpan.name}</h2>
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
            data={useOtelTerms ? otelSpan.attributes : tags}
            label={tagsLabel}
            linksGetter={linksGetter}
            isOpen={isTagsOpen}
            onToggle={() => tagsToggle(otelSpan.spanId)}
          />
          {(useOtelTerms ? otelSpan.resource.attributes : process.tags) && (
            <AccordianKeyValues
              className="ub-mb1"
              data={useOtelTerms ? otelSpan.resource.attributes : process.tags}
              label={processLabel}
              linksGetter={linksGetter}
              isOpen={isProcessOpen}
              onToggle={() => processToggle(otelSpan.spanId)}
            />
          )}
        </div>
        {(useOtelTerms ? otelSpan.events : logs) && (useOtelTerms ? otelSpan.events : logs).length > 0 && (
          <AccordianLogs
            linksGetter={linksGetter}
            logs={useOtelTerms ? otelSpan.events : logs}
            isOpen={logsState.isOpen}
            openedItems={logsState.openedItems}
            onToggle={() => logsToggle(otelSpan.spanId)}
            onItemToggle={logItem => logItemToggle(otelSpan.spanId, logItem)}
            timestamp={traceStartTime}
            currentViewRangeTime={currentViewRangeTime}
            traceDuration={traceDuration}
            spanID={otelSpan.spanId}
            useOtelTerms={useOtelTerms}
            label={logsLabel}
          />
        )}
        {warnings && warnings.length > 0 && (
          <AccordianText
            className="AccordianWarnings"
            headerClassName="AccordianWarnings--header"
            label={<span className="AccordianWarnings--label">Warnings</span>}
            data={warnings}
            isOpen={isWarningsOpen}
            onToggle={() => warningsToggle(otelSpan.spanId)}
          />
        )}
        {references &&
          references.length > 0 &&
          (references.length > 1 || references[0].refType !== 'CHILD_OF') && (
            <AccordianReferences
              data={references}
              isOpen={isReferencesOpen}
              onToggle={() => referencesToggle(otelSpan.spanId)}
              focusSpan={focusSpan}
            />
          )}
        <small className="SpanDetail--debugInfo">
          <span className="SpanDetail--debugLabel" data-label="SpanID:" /> {otelSpan.spanId}
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
