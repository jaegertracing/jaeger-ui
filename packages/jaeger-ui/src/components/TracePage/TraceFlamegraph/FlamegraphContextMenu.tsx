// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef } from 'react';
import { IoRefreshOutline } from 'react-icons/io5';
import { TbArrowMerge } from 'react-icons/tb';
import { IoCopyOutline } from 'react-icons/io5';
import { MdHighlight } from 'react-icons/md';

type Props = {
  x: number;
  y: number;
  onReset: () => void;
  onCollapseAbove: () => void;
  onCopyName: () => void;
  onHighlightSimilar: () => void;
  onClose: () => void;
  isDirty: boolean;
  chartZoomed: boolean;
};

const FlamegraphContextMenu = ({
  x,
  y,
  onReset,
  onCollapseAbove,
  onCopyName,
  onHighlightSimilar,
  onClose,
  isDirty,
  chartZoomed,
}: Props) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div ref={menuRef} className="Flamegraph-context-menu" style={{ left: x, top: y }}>
      <button className="Flamegraph-context-menu--item" disabled={!isDirty} onClick={onReset} type="button">
        <IoRefreshOutline />
        Reset View
      </button>
      <button
        className="Flamegraph-context-menu--item"
        disabled={!chartZoomed}
        onClick={onCollapseAbove}
        type="button"
      >
        <TbArrowMerge />
        Collapse nodes above
      </button>
      <button className="Flamegraph-context-menu--item" onClick={onCopyName} type="button">
        <IoCopyOutline />
        Copy function name
      </button>
      <button className="Flamegraph-context-menu--item" onClick={onHighlightSimilar} type="button">
        <MdHighlight />
        Highlight similar nodes
      </button>
    </div>
  );
};

export default FlamegraphContextMenu;
