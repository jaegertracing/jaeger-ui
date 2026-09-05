// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback } from 'react';
import { Dropdown, Tooltip, message } from 'antd';
import type { MenuProps } from 'antd';
import { LuCopy, LuEllipsis, LuFocus, LuLink, LuListCollapse } from 'react-icons/lu';
import copy from 'copy-to-clipboard';
import cx from 'classnames';

import { IOtelSpan } from '../../../../types/otel';
import { useTraceTimelineStore } from '../store';

import './index.css';

type SpanRowControlsProps = {
  span: IOtelSpan;
};

export const SpanRowControls: React.FC<SpanRowControlsProps> = ({ span }) => {
  const focusedSubtreeSpanID = useTraceTimelineStore(s => s.focusedSubtreeSpanID);
  const setFocusedSubtreeSpanID = useTraceTimelineStore(s => s.setFocusedSubtreeSpanID);
  const childrenHiddenIDs = useTraceTimelineStore(s => s.childrenHiddenIDs);
  const toggleSubtreeCollapse = useTraceTimelineStore(s => s.toggleSubtreeCollapse);

  const isFocused = focusedSubtreeSpanID === span.spanID;
  const isSubtreeCollapsed = childrenHiddenIDs.has(span.spanID);

  const handleCollapseToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      toggleSubtreeCollapse(span);
    },
    [toggleSubtreeCollapse, span]
  );

  const handleFocusToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isFocused) {
        setFocusedSubtreeSpanID(null);
      } else {
        setFocusedSubtreeSpanID(span.spanID);
      }
    },
    [isFocused, setFocusedSubtreeSpanID, span.spanID]
  );

  const menuItems: MenuProps['items'] = [
    {
      key: 'copy-deep-link',
      icon: <LuLink className="SpanRowControls--menuIcon" />,
      label: 'Copy deep link',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        const deepLink = `${window.location.origin}${window.location.pathname}?uiFind=${span.spanID}`;
        copy(deepLink);
        message.success('Deep link copied to clipboard');
      },
    },
    {
      key: 'copy-span-id',
      icon: <LuCopy className="SpanRowControls--menuIcon" />,
      label: 'Copy span ID',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        copy(span.spanID);
        message.success('Span ID copied to clipboard');
      },
    },
  ];

  return (
    <div
      className={cx('SpanRowControls', {
        'is-focused': isFocused,
      })}
      onClick={e => e.stopPropagation()}
      data-testid="span-row-controls"
    >
      {span.hasChildren && (
        <Tooltip
          title={isSubtreeCollapsed ? 'Expand subtree' : 'Collapse subtree'}
          placement="top"
          mouseLeaveDelay={0}
        >
          <button
            type="button"
            className="SpanRowControls--button"
            onClick={handleCollapseToggle}
            aria-label={isSubtreeCollapsed ? 'Expand subtree' : 'Collapse subtree'}
            data-testid="collapse-subtree-btn"
          >
            <LuListCollapse />
          </button>
        </Tooltip>
      )}

      <Tooltip
        title={isFocused ? 'Reset subtree focus' : 'Focus subtree'}
        placement="top"
        mouseLeaveDelay={0}
      >
        <button
          type="button"
          className={cx('SpanRowControls--button', {
            'is-active': isFocused,
          })}
          onClick={handleFocusToggle}
          aria-label={isFocused ? 'Reset subtree focus' : 'Focus subtree'}
          data-testid="focus-subtree-btn"
        >
          <LuFocus />
        </button>
      </Tooltip>

      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomRight"
        arrow={{ pointAtCenter: true }}
      >
        <Tooltip title="More actions" placement="top" mouseLeaveDelay={0}>
          <button
            type="button"
            className="SpanRowControls--button"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            aria-label="More actions"
            data-testid="more-actions-btn"
          >
            <LuEllipsis />
          </button>
        </Tooltip>
      </Dropdown>
    </div>
  );
};

export default React.memo(SpanRowControls);
