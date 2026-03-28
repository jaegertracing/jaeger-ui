// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Form, Input } from 'antd';
import cx from 'classnames';
import { IoSearch } from 'react-icons/io5';
import type { NavigateFunction } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { getUrl as getCompareUrl } from '../TraceDiff/url';
import { getUrl as getTraceUrl } from '../TracePage/url';
import { getJaegerCopilotRuntimeUrl } from './copilot-runtime';
import { useJaegerAssistant } from './JaegerAssistantContext';
import { isTraceIdLookupQuery } from './jaegerOmnibox';
import './JaegerTopSearch.css';

/*
  The single search box in the top bar. We can type a trace ID (hex) to go to a trace, 
  or a question when the AI runtime is set - it then calls `openWithMessage` to send that text into the assistant.
  It uses React state for the text and focus so the box can grow wider when you focus or type.
*/
function navigateTraceOrCompare(value: string, navigate: NavigateFunction) {
  const s = value.trim();
  if (s.includes('...')) {
    const [a, b] = s.split('...');
    navigate(
      getCompareUrl({
        a: a.toLowerCase(),
        b: b.toLowerCase(),
        cohort: [],
      })
    );
    return;
  }
  navigate(getTraceUrl(s.toLowerCase()));
}

const JaegerTopSearch: React.FC = () => {
  const navigate = useNavigate();
  const runtimeUrl = getJaegerCopilotRuntimeUrl();
  const { openWithMessage } = useJaegerAssistant();
  const [value, setValue] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const isExpanded = focused || value.length > 0;

  const goToTrace = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const raw = value.trim();
      if (!raw) {
        return;
      }

      if (!runtimeUrl) {
        navigateTraceOrCompare(raw, navigate);
        return;
      }

      if (isTraceIdLookupQuery(raw)) {
        navigateTraceOrCompare(raw, navigate);
        return;
      }

      openWithMessage(raw);
      setValue('');
    },
    [navigate, openWithMessage, runtimeUrl, value]
  );

  const placeholder = runtimeUrl ? 'Trace ID or Ask Jaeger' : 'Lookup by Trace ID…';

  return (
    <div className={cx('JaegerTopSearch-root', isExpanded && 'JaegerTopSearch-root--expanded')}>
      <Form
        data-testid="JaegerTopSearch--form"
        layout="horizontal"
        onSubmitCapture={goToTrace}
        className="JaegerTopSearch--form"
      >
        <Input
          className="JaegerTopSearch--input"
          data-testid="jaegerOmnibox"
          name="jaegerOmnibox"
          placeholder={placeholder}
          prefix={<IoSearch />}
          allowClear
          autoComplete="off"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Form>
    </div>
  );
};

export default React.memo(JaegerTopSearch);
