// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Button, Dropdown, InputRef, Tooltip } from 'antd';
import { IoLocate, IoHelp, IoChevronDown, IoChevronUp, IoEye, IoEyeOff } from 'react-icons/io5';

import * as markers from './TracePageSearchBar.markers';
import { trackFilter } from '../index.track';
import UiFindInput from '../../common/UiFindInput';
import { TNil } from '../../../types';
import { TOOLTIP_TRIGGERS } from '../TraceTimelineViewer/ServiceFilter';
import './TracePageSearchBar.css';

// The crosshair icon does not convey what the focus button does, so the tooltip spells it out.
const FOCUS_MATCHES_TOOLTIP = 'Collapse the trace to the paths leading to the matching spans';

type TracePageSearchBarProps = {
  textFilter: string | TNil;
  prevResult: () => void;
  nextResult: () => void;
  clearSearch: () => void;
  focusUiFindMatches: () => void;
  resultCount: number;
  // Why the "Keep matching spans" or "Hide matching spans" entry is disabled, or nothing while it
  // is enabled: the keep entry in remove mode, and either entry when it would leave no span shown.
  keepDisabledReason?: string | null;
  hideDisabledReason?: string | null;
  // Turns the search text into a chip with the verb. The menu is shown only when this is set.
  onConvertSearch?: (verb: 'keep' | 'hide') => void;
  // The funnel button, rendered at the end of the cluster; null in views that cannot hide spans.
  spanFilterNode?: React.ReactNode;
  navigable: boolean;
  useOtelTerms: boolean;
};

export function TracePageSearchBarFn(props: TracePageSearchBarProps & { forwardedRef: React.Ref<InputRef> }) {
  const {
    focusUiFindMatches,
    forwardedRef,
    keepDisabledReason = null,
    hideDisabledReason = null,
    navigable,
    nextResult,
    onConvertSearch,
    prevResult,
    resultCount,
    spanFilterNode,
    textFilter,
    useOtelTerms,
  } = props;

  const hasText = Boolean(textFilter);
  const count = hasText ? <span className="TracePageSearchBar--count">{resultCount}</span> : null;

  const convertMenu =
    onConvertSearch && spanFilterNode && textFilter ? (
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'keep',
              icon: <IoEye />,
              label: keepDisabledReason ? (
                <Tooltip title={keepDisabledReason}>Keep matching spans</Tooltip>
              ) : (
                'Keep matching spans'
              ),
              disabled: Boolean(keepDisabledReason),
              onClick: () => onConvertSearch('keep'),
            },
            {
              key: 'hide',
              icon: <IoEyeOff />,
              label: hideDisabledReason ? (
                <Tooltip title={hideDisabledReason}>Hide matching spans</Tooltip>
              ) : (
                'Hide matching spans'
              ),
              disabled: Boolean(hideDisabledReason),
              onClick: () => onConvertSearch('hide'),
            },
          ],
        }}
      >
        <Tooltip title="Turn this text into a filter">
          <button
            type="button"
            className="TracePageSearchBar--convertBtn"
            aria-label="Turn this text into a filter"
            data-testid="convert-search"
          >
            <IoChevronDown />
          </button>
        </Tooltip>
      </Dropdown>
    ) : null;

  const uiFindInputInputProps = {
    'data-test': markers.IN_TRACE_SEARCH,
    className: 'TracePageSearchBar--bar ub-flex-auto',
    name: 'search',
    suffix: (
      <>
        {count}
        {convertMenu}
      </>
    ),
  };

  const renderTooltip = () => {
    return (
      <div style={{ wordBreak: 'normal' }}>
        <p>
          This is an in-page search. Enter the query as a list of space-separated string terms. Each term is
          used in a substring match against any of the following data elements: service name,{' '}
          {useOtelTerms ? 'span name' : 'operation name'}, span ID, and key-value pairs in{' '}
          {useOtelTerms ? 'attributes and events' : 'tags and logs'}. The spans that match any of the search
          terms will be highlighted.
        </p>
        <p>
          For exact phrase search surround the query in double quotes like{' '}
          <code>&quot;The quick brown fox&quot;</code>
        </p>
        <p>
          When matching key-value pairs, the substring search is applied separately against the key, the
          value, and the concatenated <code>&quot;key=value&quot;</code> string. The latter allows searching
          for exact matches like <code>http.status_code=200</code>.
        </p>
        <p>
          To preclude certain key-value pairs from participating in the matching, prefix the key with the
          minus <code>&apos;-&apos;</code> sign, e.g., <code>-http.status_code</code>.
        </p>
      </div>
    );
  };

  return (
    <div className="TracePageSearchBar">
      <div className="TracePageSearchBar--controls">
        <UiFindInput inputProps={uiFindInputInputProps} ref={forwardedRef} trackFindFunction={trackFilter} />
        <Tooltip
          arrow={{ pointAtCenter: true }}
          placement="bottomLeft"
          trigger={TOOLTIP_TRIGGERS}
          overlayStyle={{ maxWidth: '600px' }} // This is a large tooltip and the default is too narrow.
          title={renderTooltip()}
        >
          <Button
            aria-label="Search syntax"
            className="TracePageSearchBar--btn TracePageSearchBar--helpBtn"
            htmlType="button"
            data-testid="search-help"
          >
            <IoHelp />
          </Button>
        </Tooltip>
        {navigable && (
          <>
            <Tooltip title={FOCUS_MATCHES_TOOLTIP} trigger={TOOLTIP_TRIGGERS}>
              <Button
                aria-label="Focus on matches"
                className="TracePageSearchBar--btn TracePageSearchBar--locateBtn"
                disabled={!hasText}
                htmlType="button"
                onClick={focusUiFindMatches}
              >
                <IoLocate />
              </Button>
            </Tooltip>
            <Tooltip title="Previous match" trigger={TOOLTIP_TRIGGERS}>
              <Button
                aria-label="Previous match"
                className="TracePageSearchBar--btn TracePageSearchBar--ButtonUp"
                disabled={!hasText}
                htmlType="button"
                data-testid="UpOutlined"
                onClick={prevResult}
              >
                <IoChevronUp />
              </Button>
            </Tooltip>
            <Tooltip title="Next match" trigger={TOOLTIP_TRIGGERS}>
              <Button
                aria-label="Next match"
                className="TracePageSearchBar--btn TracePageSearchBar--ButtonDown"
                disabled={!hasText}
                htmlType="button"
                data-testid="DownOutlined"
                onClick={nextResult}
              >
                <IoChevronDown />
              </Button>
            </Tooltip>
          </>
        )}
        {spanFilterNode && <span className="TracePageSearchBar--filter">{spanFilterNode}</span>}
      </div>
    </div>
  );
}

export default React.forwardRef((props: TracePageSearchBarProps, ref: React.Ref<InputRef>) => (
  <TracePageSearchBarFn {...props} forwardedRef={ref} />
));
