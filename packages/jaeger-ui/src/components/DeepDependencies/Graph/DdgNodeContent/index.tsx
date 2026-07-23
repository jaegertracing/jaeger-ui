// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Popover } from 'antd';
import cx from 'classnames';
import { useLocation, useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { TLayoutVertex } from '@jaegertracing/plexus/lib/types';
import { IoLocate, IoEyeOff, IoSearch } from 'react-icons/io5';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';

import calcPositioning from './calc-positioning';
import { OP_PADDING_TOP, PROGRESS_BAR_STROKE_WIDTH, RADIUS, WORD_RX } from './constants';
import { setFocusIcon } from './node-icons';
import { trackSetFocus, trackViewTraces, trackVertexSetOperation } from '../../index.track';
import { getUrl } from '../../url';
import BreakableText from '../../../common/BreakableText';
import FilteredList from '../../../common/FilteredList';
import { getUrl as getSearchUrl, getUrlState } from '../../../SearchTracePage/url';
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
    search: string;
    navigate: NavigateFunction;
  };

type TState = {
  childrenVisibility?: ECheckedStatus | null;
  parentVisibility?: ECheckedStatus | null;
  shouldPositionTooltipBelow?: boolean;
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

export const UnconnectedDdgNodeContent = React.memo(function UnconnectedDdgNodeContent(props: TProps) {
  const [state, setState] = React.useState<TState>({});
  const hoveredIndices = React.useRef<Set<number>>(new Set());
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const prevDecorationID = React.useRef<string | undefined>(undefined);
  const setViewModifierRef = React.useRef<TProps['setViewModifier']>(() => {});

  const {
    decorationID,
    decorationProgressbar,
    decorationValue,
    focalNodeUrl,
    focusPathsThroughVertex,
    getDecoration,
    getGenerationVisibility,
    getVisiblePathElems,
    hideVertex: hideVertexProp,
    isFocalNode,
    isPositioned,
    operation,
    selectVertex,
    service,
    setOperation: setOperationProp,
    setViewModifier,
    updateGenerationVisibility,
    vertex,
    vertexKey,
    search,
    navigate,
  } = props;

  React.useEffect(() => {
    setViewModifierRef.current = setViewModifier;
  }, [setViewModifier]);

  React.useEffect(() => {
    // Match the former componentDidUpdate behavior: refresh only when decorationID changes.
    if (decorationID && prevDecorationID.current !== decorationID) {
      getDecoration(decorationID, service, typeof operation === 'string' ? operation : undefined);
    }
    prevDecorationID.current = decorationID;
  }, [decorationID, getDecoration, operation, service]);

  React.useEffect(
    () => () => {
      if (hoveredIndices.current.size) {
        setViewModifierRef.current(Array.from(hoveredIndices.current), EViewModifier.Hovered, false);
        hoveredIndices.current.clear();
      }
    },
    []
  );

  const checkTooltipPosition = React.useCallback(() => {
    if (!nodeRef.current) return;
    const header = document.querySelector('.DdgHeader--controlHeader');
    if (!header) return;
    const shouldPositionBelow =
      nodeRef.current.getBoundingClientRect().top - 200 < header.getBoundingClientRect().bottom + 20;
    setState(prevState =>
      prevState.shouldPositionTooltipBelow === shouldPositionBelow
        ? prevState
        : { ...prevState, shouldPositionTooltipBelow: shouldPositionBelow }
    );
  }, []);

  const focusPaths = React.useCallback(() => {
    focusPathsThroughVertex(vertexKey);
  }, [focusPathsThroughVertex, vertexKey]);

  const handleClick = React.useCallback(() => {
    if (decorationValue) selectVertex(vertex);
  }, [decorationValue, selectVertex, vertex]);

  const hideVertex = React.useCallback(() => {
    hideVertexProp(vertexKey);
  }, [hideVertexProp, vertexKey]);

  const setOperation = React.useCallback(
    (newOperation: string) => {
      trackVertexSetOperation();
      setOperationProp(newOperation);
    },
    [setOperationProp]
  );

  const updateChildren = React.useCallback(() => {
    updateGenerationVisibility(vertexKey, EDirection.Downstream);
  }, [updateGenerationVisibility, vertexKey]);

  const updateParents = React.useCallback(() => {
    updateGenerationVisibility(vertexKey, EDirection.Upstream);
  }, [updateGenerationVisibility, vertexKey]);

  const viewTraces = React.useCallback(() => {
    trackViewTraces();
    const { traceID: _traceID, spanLinks: _spanLinks, start, end, lookback } = getUrlState(search);

    // Only pass params that are meaningful on the Search page.
    // DDG-specific params (density, showOp, visEncoding, etc.) are intentionally excluded.
    const query = {
      ...(start && { start }),
      ...(end && { end }),
      ...(lookback && { lookback }),
      service,
      operation: typeof operation === 'string' ? operation : undefined,
    };

    const url = getSearchUrl(query);
    const qIdx = url.indexOf('?');
    navigate({
      pathname: qIdx >= 0 ? url.slice(0, qIdx) : url,
      search: qIdx >= 0 ? url.slice(qIdx) : '',
    });
  }, [navigate, operation, search, service]);

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
        if (state.shouldPositionTooltipBelow === undefined) checkTooltipPosition();
        setState(prevState => ({
          ...prevState,
          childrenVisibility: getGenerationVisibility(vertexKey, EDirection.Downstream),
          parentVisibility: getGenerationVisibility(vertexKey, EDirection.Upstream),
        }));
      } else hoveredIndices.current.clear();
    },
    [
      checkTooltipPosition,
      getGenerationVisibility,
      getVisiblePathElems,
      setViewModifier,
      state.shouldPositionTooltipBelow,
      vertexKey,
    ]
  );

  const { childrenVisibility, parentVisibility } = state;

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
      icon: <IoSearch />,
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
      onClick: hideVertex,
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
    <div ref={nodeRef} className="DdgNodeContent" onMouseOver={onMouseUx} onMouseOut={onMouseUx}>
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
                  content={<FilteredList options={operation} value={null} setValue={setOperation} />}
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
          'DdgNodeContent--actionsWrapper-below': state.shouldPositionTooltipBelow,
        })}
      />
    </div>
  );
});

type DdgNodeContentProps = Omit<
  TProps,
  keyof TDispatchProps | keyof TDecorationFromState | 'search' | 'navigate'
>;

function DdgNodeContent(props: DdgNodeContentProps) {
  const { search } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<any>>();
  const decorationProps = useSelector(
    (state: ReduxState) =>
      extractDecorationFromState(state, {
        service: props.service,
        operation: props.operation,
        search,
      }),
    shallowEqual
  );

  const getDecoration = React.useCallback(
    (id: string, svc: string, op?: string) => {
      dispatch(padActions.getDecoration(id, svc, op));
    },
    [dispatch]
  );

  return (
    <UnconnectedDdgNodeContent
      {...props}
      search={search}
      navigate={navigate}
      getDecoration={getDecoration}
      {...decorationProps}
    />
  );
}

export default DdgNodeContent;
