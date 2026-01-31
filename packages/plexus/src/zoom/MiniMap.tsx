// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { HiMiniArrowsPointingOut, HiMagnifyingGlassPlus, HiMagnifyingGlassMinus } from 'react-icons/hi2';

type TProps = {
  classNamePrefix?: string | void;
  className?: string | void;
  contentHeight: number;
  contentWidth: number;
  viewAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  viewportHeight: number;
  viewportWidth: number;
  k?: number;
  x?: number;
  y?: number;
};

const LENGTH_TARGET_PX = 80;

function getMapSize(props: TProps) {
  const { contentHeight: ch, contentWidth: cw } = props;
  if (ch > cw) {
    return { height: LENGTH_TARGET_PX, width: (LENGTH_TARGET_PX * cw) / ch };
  }
  return { height: (LENGTH_TARGET_PX * ch) / cw, width: LENGTH_TARGET_PX };
}

function getViewTransform(props: TProps, displaySize: { width: number; height: number }) {
  const {
    contentHeight: ch,
    contentWidth: cw,
    viewportHeight: vh,
    viewportWidth: vw,
    k = 1,
    x = 1,
    y = 1,
  } = props;
  const { height: dh, width: dw } = displaySize;
  const sch = ch * k;
  const scw = cw * k;
  const left = Math.max(-x / scw, 0);
  const right = Math.min((-x + vw) / scw, 1);
  const top = Math.max(-y / sch, 0);
  const bottom = Math.min((-y + vh) / sch, 1);
  return {
    transform: `
      translate(${(left * dw).toFixed(2)}px, ${(top * dh).toFixed(2)}px)
      scale(${right - left}, ${bottom - top})
    `,
    transformOrigin: '0 0',
  };
}

function getClassNames(className: string, classNamePrefix: string) {
  const base = `${classNamePrefix}-MiniMap`;
  return {
    root: `${base} ${className}`,
    item: `${base}--item`,
    map: `${base}--map`,
    mapActive: `${base}--mapActive`,
    button: `${base}--button`,
  };
}

export function MiniMap({ className = '', classNamePrefix = 'plexus', ...props }: TProps) {
  const css = getClassNames(className, classNamePrefix);
  const mapSize = getMapSize(props);
  const activeXform = getViewTransform(props, mapSize);
  return (
    <div className={css.root}>
      <div className={`${css.item} ${css.map}`} style={mapSize}>
        <div className={css.mapActive} style={{ ...activeXform, ...mapSize }} />
      </div>
      <div className={`${css.item} ${css.button}`} onClick={props.zoomIn} role="button">
        <HiMagnifyingGlassPlus />
      </div>
      <div className={`${css.item} ${css.button}`} onClick={props.zoomOut} role="button">
        <HiMagnifyingGlassMinus />
      </div>
      <div className={`${css.item} ${css.button}`} onClick={props.viewAll} role="button">
        <HiMiniArrowsPointingOut />
      </div>
    </div>
  );
}

export default React.memo(MiniMap);
