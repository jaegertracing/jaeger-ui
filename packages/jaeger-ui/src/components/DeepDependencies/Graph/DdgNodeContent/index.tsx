// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Popover } from 'antd';
import cx from 'classnames';
import { TLayoutVertex } from '@jaegertracing/plexus/lib/types';
import { IoLocate, IoEyeOff } from 'react-icons/io5';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import calcPositioning from './calc-positioning';
import {
  MAX_LENGTH,
  MAX_LINKED_TRACES,
  MIN_LENGTH,
  OP_PADDING_TOP,
  PARAM_NAME_LENGTH,
  PROGRESS_BAR_STROKE_WIDTH,
  RADIUS,
  WORD_RX,
} from './constants';
import { setFocusIcon } from './node-icons';
import { trackSetFocus, trackViewTraces, trackVertexSetOperation } from '../../index.track';
import { getUrl } from '../../url';
import BreakableText from '../../../common/BreakableText';
import FilteredList from '../../../common/FilteredList';
import NewWindowIcon from '../../../common/NewWindowIcon';
import { getUrl as getSearchUrl } from '../../../SearchTracePage/url';
import padActions from '../../../../actions/path-agnostic-decorations';
import {
  ECheckedStatus,
  EDdgDensity,
  EDirection,
  EViewModifier,
  TDdgVertex,
  PathElem,
} from '../../../../model/ddg/types';
import extractDecorationFromState, {
  TDecorationFromState,
} from '../../../../model/path-agnostic-decorations';
import { ReduxState } from '../../../../types/index';
import ActionsMenu, { IActionMenuItem } from '../../../common/ActionMenu/ActionsMenu';

import './index.css';

type TDispatchProps = {
  getDecoration: (id: string, svc: string, op?: string) => void;
};

type TProps = TDispatchProps &
  TDecorationFromState & {
    focalNodeUrl: string | null;
    focusPathsThroughVertex: (vertexKey: string) => void;
    getGenerationVisibility: (vertexKey: string, direction: EDirection) => ECheckedStatus | null;
    getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined;
    hideVertex: (vertexKey: string) => void;
    isFocalNode: boolean;
    isPositioned: boolean;
    operation: string | string[] | null;
    selectVertex: (selectedVertex: TDdgVertex) => void;
    service: string;
    setOperation: (operation: string) => void;
    setViewModifier: (visIndices: number[], viewModifier: EViewModifier, isEnabled: boolean) => void;
    updateGenerationVisibility: (vertexKey: string, direction: EDirection) => void;
    vertex: TDdgVertex;
    vertexKey: string;
  };

export function getNodeRenderer({
  baseUrl,
  density,
  extraUrlArgs,
  focusPathsThroughVertex,
  getGenerationVisibility,
  getVisiblePathElems,
  hideVertex,
  selectVertex,
  setOperation,
  setViewModifier,
  updateGenerationVisibility,
}: {
  baseUrl: string;
  density: EDdgDensity;
  extraUrlArgs?: { [key: string]: unknown };
  focusPathsThroughVertex: (vertexKey: string) => void;
  getGenerationVisibility: (vertexKey: string, direction: EDirection) => ECheckedStatus | null;
  getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined;
  hideVertex: (vertexKey: string) => void;
  selectVertex: (selectedVertex: TDdgVertex) => void;
  setOperation: (operation: string) => void;
  setViewModifier: (visIndices: number[], viewModifier: EViewModifier, isEnabled: boolean) => void;
  updateGenerationVisibility: (vertexKey: string, direction: EDirection) => void;
}) {
  return function renderNode(vertex: TDdgVertex, _: unknown, lv: TLayoutVertex | null) {
    const { isFocalNode, key, operation, service } = vertex;
    return (
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      <DdgNodeContent
        focalNodeUrl={isFocalNode ? null : getUrl({ density, operation, service, ...extraUrlArgs }, baseUrl)}
        focusPathsThroughVertex={focusPathsThroughVertex}
        getGenerationVisibility={getGenerationVisibility}
        getVisiblePathElems={getVisiblePathElems}
        hideVertex={hideVertex}
        isFocalNode={isFocalNode}
        isPositioned={Boolean(lv)}
        operation={operation}
        selectVertex={selectVertex}
        setOperation={setOperation}
        setViewModifier={setViewModifier}
        service={service}
        updateGenerationVisibility={updateGenerationVisibility}
        vertex={vertex}
        vertexKey={key}
      />
    );
  };
}

export function measureNode() {
  const diameter = 2 * (RADIUS + 1);

  return {
    height: diameter,
    width: diameter,
  };
}

export const UnconnectedDdgNodeContent = (props: TProps) => {
  const {
    decorationID,
    decorationProgressbar,
    decorationValue,
    focalNodeUrl,
    focusPathsThroughVertex,
    getDecoration,
    getGenerationVisibility,
    getVisiblePathElems,
    hideVertex,
    isFocalNode,
    isPositioned,
    operation,
    selectVertex,
    service,
    setOperation,
    setViewModifier,
    updateGenerationVisibility,
    vertex,
    vertexKey,
  } = props;

  const nodeRef = React.useRef<HTMLDivElement>(null);
  const hoveredIndices = React.useRef<Set<number>>(new Set());

  const [childrenVisibility, setChildrenVisibility] = React.useState<ECheckedStatus | null>();
  const [parentVisibility, setParentVisibility] = React.useState<ECheckedStatus | null>();
  const [shouldPositionTooltipBelow, setShouldPositionTooltipBelow] = React.useState<boolean>();

  React.useEffect(() => {
    if (decorationID) {
      getDecoration(decorationID, service, typeof operation === 'string' ? operation : undefined);
    }
  }, [decorationID, getDecoration, service, operation]);

  React.useEffect(() => {
    return () => {
      if (hoveredIndices.current.size) {
        setViewModifier(Array.from(hoveredIndices.current), EViewModifier.Hovered, false);
        hoveredIndices.current.clear();
      }
    };
  }, []);

  const checkTooltipPosition = React.useCallback(() => {
    if (!nodeRef.current) return;
    const header = document.querySelector('.DdgHeader--controlHeader');
    if (!header) return;
    const shouldPositionBelow =
      nodeRef.current.getBoundingClientRect().top - 200 < header.getBoundingClientRect().bottom + 20;
    setShouldPositionTooltipBelow(prev => (prev !== shouldPositionBelow ? shouldPositionBelow : prev));
  }, []);

  const focusPaths = React.useCallback(
    () => focusPathsThroughVertex(vertexKey),
    [focusPathsThroughVertex, vertexKey]
  );

  const handleClick = React.useCallback(() => {
    if (decorationValue) selectVertex(vertex);
  }, [decorationValue, selectVertex, vertex]);

  const hideNode = React.useCallback(() => hideVertex(vertexKey), [hideVertex, vertexKey]);

  const setOp = React.useCallback(
    (op: string) => {
      trackVertexSetOperation();
      setOperation(op);
    },
    [setOperation]
  );

  const updateChildren = React.useCallback(
    () => updateGenerationVisibility(vertexKey, EDirection.Downstream),
    [updateGenerationVisibility, vertexKey]
  );

  const updateParents = React.useCallback(
    () => updateGenerationVisibility(vertexKey, EDirection.Upstream),
    [updateGenerationVisibility, vertexKey]
  );

  const viewTraces = React.useCallback(() => {
    trackViewTraces();
    const elems = getVisiblePathElems(vertexKey);
    if (!elems) return;

    const urlIds = new Set<string>();
    let currLength = MIN_LENGTH;
    // Because there is a limit on traceIDs, attempt to get some from each elem rather than all from one.
    const allIDs = elems.map(({ memberOf }) => memberOf.traceIDs.slice());
    while (allIDs.length) {
      const ids = allIDs.shift();
      if (ids && ids.length) {
        const id = ids.pop();
        if (id && !urlIds.has(id)) {
          // Keep track of the length, then break if it is too long, to avoid opening a tab with a URL that
          // the backend cannot process, even if there are more traceIDs
          currLength += PARAM_NAME_LENGTH + id.length;
          if (currLength > MAX_LENGTH) {
            break;
          }
          urlIds.add(id);
          if (urlIds.size >= MAX_LINKED_TRACES) {
            break;
          }
        }
        allIDs.push(ids);
      }
    }
    window.open(getSearchUrl({ traceID: Array.from(urlIds) }), '_blank');
  }, [getVisiblePathElems, vertexKey]);

  const onMouseUx = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const hovered = event.type === 'mouseover';
      const visIndices = hovered
        ? (getVisiblePathElems(vertexKey) || []).map(({ visibilityIdx }) => {
            hoveredIndices.current.add(visibilityIdx);
            return visibilityIdx;
          })
        : Array.from(hoveredIndices.current);

      setViewModifier(visIndices, EViewModifier.Hovered, hovered);

      if (hovered) {
        if (shouldPositionTooltipBelow === undefined) checkTooltipPosition();
        setChildrenVisibility(getGenerationVisibility(vertexKey, EDirection.Downstream));
        setParentVisibility(getGenerationVisibility(vertexKey, EDirection.Upstream));
      } else hoveredIndices.current.clear();
    },
    [
      checkTooltipPosition,
      getGenerationVisibility,
      getVisiblePathElems,
      setViewModifier,
      shouldPositionTooltipBelow,
      vertexKey,
    ]
  );

  const { radius, svcWidth, opWidth, svcMarginTop } = calcPositioning(service, operation);
  const trueRadius = decorationProgressbar ? RADIUS - PROGRESS_BAR_STROKE_WIDTH : RADIUS;
  const scaleFactor = trueRadius / radius;
  const transform = `translate(${RADIUS - radius}px, ${RADIUS - radius}px) scale(${scaleFactor})`;

  const menuItems: IActionMenuItem[] = [
    {
      id: 'set-focus',
      label: 'Set focus',
      icon: setFocusIcon,
      href: focalNodeUrl || undefined,
      onClick: trackSetFocus,
      isVisible: Boolean(focalNodeUrl),
    },
    {
      id: 'view-traces',
      label: 'View traces',
      icon: <NewWindowIcon />,
      onClick: viewTraces,
    },
    {
      id: 'focus-paths',
      label: 'Focus paths through this node',
      icon: <IoLocate />,
      onClick: focusPaths,
      isVisible: !isFocalNode,
    },
    {
      id: 'hide-node',
      label: 'Hide node',
      icon: <IoEyeOff />,
      onClick: hideNode,
      isVisible: !isFocalNode,
    },
    {
      id: 'view-parents',
      label: 'View Parents',
      icon: null,
      onClick: updateParents,
      isVisible: Boolean(parentVisibility),
      checkboxProps: parentVisibility
        ? {
            checked: parentVisibility === ECheckedStatus.Full,
            indeterminate: parentVisibility === ECheckedStatus.Partial,
          }
        : undefined,
    },
    {
      id: 'view-children',
      label: 'View Children',
      icon: null,
      onClick: updateChildren,
      isVisible: Boolean(childrenVisibility),
      checkboxProps: childrenVisibility
        ? {
            checked: childrenVisibility === ECheckedStatus.Full,
            indeterminate: childrenVisibility === ECheckedStatus.Partial,
          }
        : undefined,
    },
  ];

  return (
    <div
      ref={nodeRef}
      className="DdgNodeContent"
      role="button"
      tabIndex={0}
      onMouseOver={onMouseUx}
      onMouseOut={onMouseUx}
    >
      {decorationProgressbar}
      <div
        className={cx('DdgNodeContent--core', {
          'is-decorated': decorationValue,
          'is-focalNode': isFocalNode,
          'is-missingDecoration': typeof decorationValue === 'string',
          'is-positioned': isPositioned,
        })}
        onClick={handleClick}
        role="button"
        style={{ width: `${radius * 2}px`, height: `${radius * 2}px`, transform }}
      >
        <div className="DdgNodeContent--labelWrapper">
          <h4
            className="DdgNodeContent--label"
            style={{ marginTop: `${svcMarginTop}px`, width: `${svcWidth}px` }}
          >
            <BreakableText text={service} wordRegexp={WORD_RX} />
          </h4>
          {operation && (
            <div
              className="DdgNodeContent--label"
              style={{ paddingTop: `${OP_PADDING_TOP}px`, width: `${opWidth}px` }}
            >
              {Array.isArray(operation) ? (
                <Popover
                  content={<FilteredList options={operation} value={null} setValue={setOp} />}
                  placement="bottom"
                  title="Select Operation to Filter Graph"
                >
                  <span>{`${operation.length} Operations`}</span>
                </Popover>
              ) : (
                <BreakableText text={operation} wordRegexp={WORD_RX} />
              )}
            </div>
          )}
        </div>
      </div>
      <ActionsMenu
        items={menuItems}
        className={cx('DdgNodeContent--actionsWrapper', {
          'DdgNodeContent--actionsWrapper-below': shouldPositionTooltipBelow,
        })}
      />
    </div>
  );
};

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { getDecoration } = bindActionCreators(padActions, dispatch);

  return {
    getDecoration,
  };
}

const DdgNodeContent = connect(
  extractDecorationFromState,
  mapDispatchToProps
)(React.memo(UnconnectedDdgNodeContent));

export default DdgNodeContent;
