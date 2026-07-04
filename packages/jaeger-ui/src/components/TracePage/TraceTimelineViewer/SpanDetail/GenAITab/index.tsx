// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Divider } from 'antd';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

import AccordionAttributes from '../AccordionAttributes';
import CopyIcon from '../../../../common/CopyIcon';
import { IOtelSpan } from '../../../../../types/otel';
import { formatTokenCount, getGenAiMetadata } from '../../../../../utils/genai/detect';

import '../index.css';

type Props = { span: IOtelSpan };

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
        .map((msg: unknown) => {
          const msgContent = msg && typeof msg === 'object' && 'content' in msg ? msg.content : undefined;
          if (typeof msgContent === 'string') return msgContent;
          if (msgContent !== undefined) return JSON.stringify(msgContent, null, 2);
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
        onClick={() => setIsOpen(prev => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(prev => !prev);
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
                <CopyIcon
                  copyText={textContent}
                  buttonText="Copy"
                  tooltipTitle="Copy payload"
                  placement="topRight"
                />
              </div>
              <div style={{ paddingRight: '2rem' }}>{textContent}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GenAITab({ span }: Props): React.ReactElement {
  const [isAttributesOpen, setIsAttributesOpen] = useState(false);

  const genAiMetadata = React.useMemo(() => {
    return getGenAiMetadata(span.attributes, span.events);
  }, [span.attributes, span.events]);

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

  return (
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
                        <span className="LabeledList--label">{item.label}</span> <strong>{item.value}</strong>
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
                        <span className="LabeledList--label">{item.label}</span> <strong>{item.value}</strong>
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
            label="Attributes"
            isOpen={isAttributesOpen}
            onToggle={() => setIsAttributesOpen(prev => !prev)}
            linksGetter={null}
          />
        </div>
      )}
    </div>
  );
}
