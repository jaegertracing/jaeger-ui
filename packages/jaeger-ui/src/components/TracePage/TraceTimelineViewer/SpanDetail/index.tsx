// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Divider, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { IoChevronDown, IoChevronForward, IoLinkOutline } from 'react-icons/io5';

import AccordionAttributes from './AccordionAttributes';
import AccordionEvents from './AccordionEvents';
import AccordionLinks from './AccordionLinks';
import AccordionText from './AccordionText';
import DetailState from './DetailState';
import { formatDuration, formatDurationCompact } from '../utils';
import CopyIcon from '../../../common/CopyIcon';
import LabeledList from '../../../common/LabeledList';

import { TNil } from '../../../../types';
import { Hyperlink } from '../../../../types/hyperlink';
import { IOtelSpan, IAttribute, IEvent } from '../../../../types/otel';

import { formatTokenCount, getGenAiMetadata, isGenAiSpan } from '../../../../utils/genai/detect';

import './index.css';

type SpanDetailProps = {
  detailState: DetailState;
  linksGetter: ((links: ReadonlyArray<IAttribute>, index: number) => Hyperlink[]) | TNil;
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
  useOtelTerms: boolean;
  eventsInitialVisibleCount?: number;
};

function tryParseJsonString(value: string): unknown {
  try {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(value);
    }
    return value;
  } catch {
    return value;
  }
}

function AccordionGenAiBlock(props: { label: string; content: string }) {
  const { content, label } = props;
  const [isOpen, setIsOpen] = useState(false);

  const textContent = React.useMemo(() => {
    if (!isOpen) return '';
    const parsed = tryParseJsonString(content);
    const isJson = typeof parsed === 'object' && parsed !== null;
    if (isJson && Array.isArray(parsed)) {
      const contents = parsed
        .map(msg => {
          const msgContent = msg && typeof msg === 'object' ? msg.content : undefined;
          if (typeof msgContent === 'string') return msgContent;
          if (msgContent) return JSON.stringify(msgContent, null, 2);
          return '';
        })
        .filter(Boolean);
      if (contents.length > 0) {
        return contents.join('\n\n');
      }
    } else if (isJson) {
      return JSON.stringify(parsed, null, 2);
    }
    return content;
  }, [content, isOpen]);

  const iconCls = 'u-align-icon';
  const arrow = isOpen ? <IoChevronDown className={iconCls} /> : <IoChevronForward className={iconCls} />;

  return (
    <div className="SpanDetail--accordionGenAi">
      <div
        className="AccordionAttributes--header"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        {arrow}
        <strong>{label}</strong>
      </div>
      {isOpen && (
        <div className="SpanDetail--genAiContentBox SpanDetail--genAiMessageBody">
          {textContent && (
            <div className="ub-relative">
              <div className="ub-absolute ub-right-0 ub-top-0 ub-m1">
                <CopyIcon copyText={textContent} buttonText="" tooltipTitle="Copy" placement="topRight" />
              </div>
              <div style={{ paddingRight: '2rem' }}>{textContent}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
    useOtelTerms,
    eventsInitialVisibleCount,
  } = props;

  const { isAttributesOpen, isResourceOpen, events: eventsState, isWarningsOpen, isLinksOpen } = detailState;
  const warnings = span.warnings;

  const links = span.links || [];
  const attributesLabel = useOtelTerms ? 'Attributes' : 'Tags';
  const resourceLabel = useOtelTerms ? 'Resource' : 'Process';

  const overviewItems = [
    { key: 'svc', label: 'Service:', value: span.resource.serviceName },
    { key: 'duration', label: 'Duration:', value: formatDurationCompact(span.duration) },
    { key: 'start', label: 'Start Time:', value: formatDuration(span.relativeStartTime) },
  ];
  const deepLinkCopyText = `${window.location.origin}${window.location.pathname}?uiFind=${span.spanID}`;

  const isGenAi = isGenAiSpan(span.attributes, span.name);

  const standardContent = (
    <>
      <AccordionAttributes
        data={span.attributes}
        label={attributesLabel}
        linksGetter={linksGetter}
        isOpen={isAttributesOpen}
        onToggle={() => attributesToggle(span.spanID)}
      />
      {span.resource.attributes && span.resource.attributes.length > 0 && (
        <AccordionAttributes
          className="ub-mb1"
          data={span.resource.attributes}
          label={resourceLabel}
          linksGetter={linksGetter}
          isOpen={isResourceOpen}
          onToggle={() => resourceToggle(span.spanID)}
        />
      )}
      {span.events && span.events.length > 0 && (
        <AccordionEvents
          linksGetter={linksGetter}
          events={span.events}
          isOpen={eventsState.isOpen}
          openedItems={eventsState.openedItems}
          onToggle={() => eventsToggle(span.spanID)}
          onItemToggle={eventItem => eventItemToggle(span.spanID, eventItem)}
          timestamp={traceStartTime}
          currentViewRangeTime={currentViewRangeTime}
          traceDuration={traceDuration}
          spanID={span.spanID}
          useOtelTerms={useOtelTerms}
          initialVisibleCount={eventsInitialVisibleCount}
        />
      )}
      {warnings && warnings.length > 0 && (
        <AccordionText
          className="AccordianWarnings"
          headerClassName="AccordianWarnings--header"
          label={<span className="AccordianWarnings--label">Warnings</span>}
          data={warnings}
          isOpen={isWarningsOpen}
          onToggle={() => warningsToggle(span.spanID)}
        />
      )}
      {links && links.length > 0 && (
        <AccordionLinks
          data={links}
          isOpen={isLinksOpen}
          onToggle={() => linksToggle(span.spanID)}
          focusSpan={focusSpan}
          useOtelTerms={useOtelTerms}
        />
      )}
    </>
  );

  let contentNode = standardContent;

  if (isGenAi) {
    const genAiMetadata = getGenAiMetadata(span.attributes, span.events);
    const genAiSummaryItems = [
      genAiMetadata.provider && { key: 'provider', label: 'Provider:', value: genAiMetadata.provider },
      genAiMetadata.model && { key: 'model', label: 'Model:', value: genAiMetadata.model },
      genAiMetadata.operationName && {
        key: 'operation',
        label: 'Operation:',
        value: genAiMetadata.operationName,
      },
    ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

    const genAiTokenItems = [
      genAiMetadata.inputTokens != null && {
        key: 'input_tokens',
        label: 'Input Tokens:',
        value: formatTokenCount(genAiMetadata.inputTokens) || '-',
      },
      genAiMetadata.outputTokens != null && {
        key: 'output_tokens',
        label: 'Output Tokens:',
        value: formatTokenCount(genAiMetadata.outputTokens) || '-',
      },
      genAiMetadata.totalTokens != null && {
        key: 'total_tokens',
        label: 'Total Tokens:',
        value: formatTokenCount(genAiMetadata.totalTokens) || '-',
      },
    ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

    const genAiTags = span.attributes.filter(a => a.key.startsWith('gen_ai.'));

    const genAiContent = (
      <div className="SpanDetail--genAi">
        {(genAiSummaryItems.length > 0 || genAiTokenItems.length > 0) && (
          <div className="SpanDetail--genAiSection">
            <table className="SpanDetail--genAiMetaTable">
              <tbody>
                {genAiSummaryItems.length > 0 && (
                  <tr>
                    {genAiSummaryItems.map((item, i) => (
                      <React.Fragment key={item.key}>
                        <td data-testid={`item-${item.key}`}>
                          <span className="LabeledList--label">{item.label}</span>{' '}
                          <strong>{item.value}</strong>
                        </td>
                        {i < genAiSummaryItems.length - 1 && (
                          <td className="SpanDetail--genAiMetaDivider">
                            <Divider type="vertical" />
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                )}
                {genAiTokenItems.length > 0 && (
                  <tr>
                    {genAiTokenItems.map((item, i) => (
                      <React.Fragment key={item.key}>
                        <td data-testid={`item-${item.key}`}>
                          <span className="LabeledList--label">{item.label}</span>{' '}
                          <strong>{item.value}</strong>
                        </td>
                        {i < genAiTokenItems.length - 1 && (
                          <td className="SpanDetail--genAiMetaDivider">
                            <Divider type="vertical" />
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {(genAiMetadata.prompt || genAiMetadata.completion) && (
          <div className="SpanDetail--genAiSection">
            {genAiMetadata.prompt && <AccordionGenAiBlock label="Input" content={genAiMetadata.prompt} />}
            {genAiMetadata.completion && (
              <AccordionGenAiBlock label="Output" content={genAiMetadata.completion} />
            )}
          </div>
        )}

        {genAiTags.length > 0 && (
          <div className="SpanDetail--genAiSection">
            <AccordionAttributes
              data={genAiTags}
              label={attributesLabel}
              linksGetter={linksGetter}
              isOpen={isAttributesOpen}
              onToggle={() => attributesToggle(span.spanID)}
            />
          </div>
        )}
      </div>
    );

    const tabItems: TabsProps['items'] = [
      { key: 'genai', label: 'GenAI', children: genAiContent },
      { key: 'default', label: 'Default', children: standardContent },
    ];

    contentNode = <Tabs defaultActiveKey="genai" items={tabItems} className="SpanDetail--tabs" />;
  }

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
        {contentNode}
        <small className="SpanDetail--debugInfo">
          <span className="SpanDetail--debugLabel" data-label="SpanID:" /> {span.spanID}
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
