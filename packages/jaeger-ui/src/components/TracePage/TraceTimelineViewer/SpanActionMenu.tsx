// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Dropdown, Menu } from 'antd';
import { IoChevronCollapse, IoLocationOutline, IoEllipsisHorizontal, IoCloseCircleOutline } from 'react-icons/io5';

import './SpanActionMenu.css';

type Props = {
  spanID: string;
  onCollapseChildren?: () => void;
  onFocusSubtree?: () => void;
  isFocusedSubtree?: boolean;
};

export default function SpanActionMenu({ spanID, onCollapseChildren, onFocusSubtree, isFocusedSubtree }: Props) {
  const handleCopyLink = () => {
    // Generate deep link or simply copy window URL with span focus
    const url = new URL(window.location.href);
    url.searchParams.set('uiFind', spanID);
    navigator.clipboard.writeText(url.toString());
  };

  const handleCopySpanId = () => {
    navigator.clipboard.writeText(spanID);
  };

  const menu = (
    <Menu>
      <Menu.Item key="copy-link" onClick={handleCopyLink}>
        Copy deep link
      </Menu.Item>
      <Menu.Item key="copy-id" onClick={handleCopySpanId}>
        Copy span ID
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={`SpanActionMenu ${isFocusedSubtree ? 'is-focused' : ''}`}>
      {onCollapseChildren && (
        <button className="SpanActionMenu--btn" onClick={onCollapseChildren} title="Collapse children">
          <IoChevronCollapse />
        </button>
      )}
      {onFocusSubtree && (
        <button className="SpanActionMenu--btn" onClick={onFocusSubtree} title={isFocusedSubtree ? 'Reset focus' : 'Focus subtree'}>
          {isFocusedSubtree ? <IoCloseCircleOutline color="#f5222d" /> : <IoLocationOutline />}
        </button>
      )}
      <Dropdown overlay={menu} trigger={['click']}>
        <button className="SpanActionMenu--btn" title="More actions">
          <IoEllipsisHorizontal />
        </button>
      </Dropdown>
    </div>
  );
}
