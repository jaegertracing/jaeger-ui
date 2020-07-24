// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import { Checkbox, Popover } from 'antd';
import cx from 'classnames';
import { TLayoutVertex } from '@jaegertracing/plexus/lib/types';
import IoAndroidLocate from 'react-icons/lib/io/android-locate';
import MdVisibilityOff from 'react-icons/lib/md/visibility-off';
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

type TState = {
  childrenVisibility?: ECheckedStatus | null;
  parentVisibility?: ECheckedStatus | null;
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
  return function renderNode(vertex: TDdgVertex, _: unknown, lv: TLayoutVertex<any> | null) {
    const { isFocalNode, key, operation, service } = vertex;
    return (
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

export class UnconnectedDdgNodeContent extends React.PureComponent<TProps, TState> {
  state: TState = {};
  hoveredIndices: Set<number> = new Set();

  constructor(props: TProps) {
    super(props);

    this.getDecoration();
  }

  componentDidUpdate(prevProps: TProps) {
    if (prevProps.decorationID !== this.props.decorationID) this.getDecoration();
  }

  componentWillUnmount() {
    if (this.hoveredIndices.size) {
      this.props.setViewModifier(Array.from(this.hoveredIndices), EViewModifier.Hovered, false);
      this.hoveredIndices.clear();
    }
  }

  private getDecoration() {
    const { decorationID, getDecoration, operation, service } = this.props;

    if (decorationID) {
      getDecoration(decorationID, service, typeof operation === 'string' ? operation : undefined);
    }
  }

  private focusPaths = () => {
    const { focusPathsThroughVertex, vertexKey } = this.props;
    focusPathsThroughVertex(vertexKey);
  };

  private handleClick = () => {
    const { decorationValue, selectVertex, vertex } = this.props;
    if (decorationValue) selectVertex(vertex);
  };

  private hideVertex = () => {
    const { hideVertex, vertexKey } = this.props;
    hideVertex(vertexKey);
  };

  private setOperation = (operation: string) => {
    trackVertexSetOperation();
    this.props.setOperation(operation);
  };

  private updateChildren = () => {
    const { updateGenerationVisibility, vertexKey } = this.props;
    updateGenerationVisibility(vertexKey, EDirection.Downstream);
  };

  private updateParents = () => {
    const { updateGenerationVisibility, vertexKey } = this.props;
    updateGenerationVisibility(vertexKey, EDirection.Upstream);
  };

  private viewTraces = () => {
    trackViewTraces();
    const { vertexKey, getVisiblePathElems } = this.props;
    const elems = getVisiblePathElems(vertexKey);
    if (elems) {
      const urlIds: Set<string> = new Set();
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
    }
  };

  private onMouseUx = (event: React.MouseEvent<HTMLElement>) => {
    const { getGenerationVisibility, getVisiblePathElems, setViewModifier, vertexKey } = this.props;
    const hovered = event.type === 'mouseover';
    const visIndices = hovered
      ? (getVisiblePathElems(vertexKey) || []).map(({ visibilityIdx }) => {
          this.hoveredIndices.add(visibilityIdx);
          return visibilityIdx;
        })
      : Array.from(this.hoveredIndices);
    setViewModifier(visIndices, EViewModifier.Hovered, hovered);

    if (hovered) {
      this.setState({
        childrenVisibility: getGenerationVisibility(vertexKey, EDirection.Downstream),
        parentVisibility: getGenerationVisibility(vertexKey, EDirection.Upstream),
      });
    } else this.hoveredIndices.clear();
  };

  render() {
    const { childrenVisibility, parentVisibility } = this.state;
    const {
      decorationProgressbar,
      decorationValue,
      focalNodeUrl,
      isFocalNode,
      isPositioned,
      operation,
      service,
    } = this.props;

    const { radius, svcWidth, opWidth, svcMarginTop } = calcPositioning(service, operation);
    const trueRadius = decorationProgressbar ? RADIUS - PROGRESS_BAR_STROKE_WIDTH : RADIUS;
    const scaleFactor = trueRadius / radius;
    const transform = `translate(${RADIUS - radius}px, ${RADIUS - radius}px) scale(${scaleFactor})`;

    return (
      <div className="DdgNodeContent" onMouseOver={this.onMouseUx} onMouseOut={this.onMouseUx}>
        {decorationProgressbar}
        <div
          className={cx('DdgNodeContent--core', {
            'is-decorated': decorationValue,
            'is-focalNode': isFocalNode,
            'is-missingDecoration': typeof decorationValue === 'string',
            'is-positioned': isPositioned,
          })}
          onClick={this.handleClick}
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
                    content={<FilteredList options={operation} value={null} setValue={this.setOperation} />}
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
        <div className="DdgNodeContent--actionsWrapper">
          {focalNodeUrl && (
            <a href={focalNodeUrl} className="DdgNodeContent--actionsItem" onClick={trackSetFocus}>
              <span className="DdgNodeContent--actionsItemIconWrapper">{setFocusIcon}</span>
              <span className="DdgNodeContent--actionsItemText">Set focus</span>
            </a>
          )}
          <a className="DdgNodeContent--actionsItem" onClick={this.viewTraces} role="button">
            <span className="DdgNodeContent--actionsItemIconWrapper">
              <NewWindowIcon />
            </span>
            <span className="DdgNodeContent--actionsItemText">View traces</span>
          </a>
          {!isFocalNode && (
            <a className="DdgNodeContent--actionsItem" onClick={this.focusPaths} role="button">
              <span className="DdgNodeContent--actionsItemIconWrapper">
                <IoAndroidLocate />
              </span>
              <span className="DdgNodeContent--actionsItemText">Focus paths through this node</span>
            </a>
          )}
          {!isFocalNode && (
            <a className="DdgNodeContent--actionsItem" onClick={this.hideVertex} role="button">
              <span className="DdgNodeContent--actionsItemIconWrapper">
                <MdVisibilityOff />
              </span>
              <span className="DdgNodeContent--actionsItemText">Hide node</span>
            </a>
          )}
          {parentVisibility && (
            <a className="DdgNodeContent--actionsItem" onClick={this.updateParents} role="button">
              <span className="DdgNodeContent--actionsItemIconWrapper">
                <Checkbox
                  checked={parentVisibility === ECheckedStatus.Full}
                  indeterminate={parentVisibility === ECheckedStatus.Partial}
                />
              </span>
              <span className="DdgNodeContent--actionsItemText">View Parents</span>
            </a>
          )}
          {childrenVisibility && (
            <a className="DdgNodeContent--actionsItem" onClick={this.updateChildren} role="button">
              <span className="DdgNodeContent--actionsItemIconWrapper">
                <Checkbox
                  checked={childrenVisibility === ECheckedStatus.Full}
                  indeterminate={childrenVisibility === ECheckedStatus.Partial}
                />
              </span>
              <span className="DdgNodeContent--actionsItemText">View Children</span>
            </a>
          )}
        </div>
      </div>
    );
  }
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { getDecoration } = bindActionCreators(padActions, dispatch);

  return {
    getDecoration,
  };
}

const DdgNodeContent = connect(
  extractDecorationFromState,
  mapDispatchToProps
)(UnconnectedDdgNodeContent);

export default DdgNodeContent;
