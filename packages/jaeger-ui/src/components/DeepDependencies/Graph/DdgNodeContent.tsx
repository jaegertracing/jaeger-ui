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
import cx from 'classnames';
import { TMeasureNodeUtils, TRendererUtils } from '@jaegertracing/plexus/lib/Digraph/types';
import { TLayoutVertex, TVertex } from '@jaegertracing/plexus/lib/types';

import { focalNodeIcon, setFocusIcon } from './node-icons';
import { getUrl } from '../url';
import NewWindowIcon from '../../common/NewWindowIcon';
import { getUrl as getSearchUrl } from '../../SearchTracePage/url';
import { EDdgDensity, EViewModifier, TDdgVertex, PathElem } from '../../../model/ddg/types';

import './DdgNodeContent.css';

type TProps = {
  focalNodeUrl: string | null;
  getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined;
  isFocalNode: boolean;
  isPositioned: boolean;
  operation: string | null;
  service: string;
  setViewModifier: (vertexKey: string, viewModifier: EViewModifier, isEnabled: boolean) => void;
  vertexKey: string;
};

// While browsers suport URLs of unlimited length, many server clients do not handle more than this max
const MAX_LENGTH = 2083;
const MAX_LINKED_TRACES = 35;
const MIN_LENGTH = getSearchUrl().length;
const PARAM_NAME_LENGTH = '&traceID='.length;

export default class DdgNodeContent extends React.PureComponent<TProps> {
  static measureNode(_: TVertex<any>, utils: TMeasureNodeUtils) {
    const { height, width } = utils.getWrapperSize();
    return {
      height: height + 2,
      width: width + 2,
    };
  }

  static getNodeRenderer(
    getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined,
    setViewModifier: (vertexKey: string, viewModifier: EViewModifier, enable: boolean) => void,
    density: EDdgDensity,
    showOp: boolean
  ) {
    return function renderNode(vertex: TDdgVertex, utils: TRendererUtils, lv: TLayoutVertex<any> | null) {
      const { isFocalNode, key, operation, service } = vertex;
      return (
        <DdgNodeContent
          focalNodeUrl={isFocalNode ? null : getUrl({ density, operation, service, showOp })}
          getVisiblePathElems={getVisiblePathElems}
          isFocalNode={isFocalNode}
          isPositioned={Boolean(lv)}
          operation={operation}
          setViewModifier={setViewModifier}
          service={service}
          vertexKey={key}
        />
      );
    };
  }

  private viewTraces = () => {
    const { vertexKey, getVisiblePathElems } = this.props;
    const elems = getVisiblePathElems(vertexKey);
    if (elems) {
      const ids: Set<string> = new Set();
      let currLength = MIN_LENGTH;
      for (let i = 0; i < elems.length; i++) {
        const id = elems[i].memberOf.traceID;
        if (ids.has(id)) {
          continue;
        }
        // Keep track of the length, then break if it is too long, to avoid opening a tab with a URL that the
        // backend cannot process, even if there are more traceIDs
        currLength += PARAM_NAME_LENGTH + id.length;
        if (currLength > MAX_LENGTH) {
          break;
        }
        ids.add(id);
        if (ids.size >= MAX_LINKED_TRACES) {
          break;
        }
      }
      window.open(getSearchUrl({ traceID: Array.from(ids) }), '_blank');
    }
  };

  private onMouseUx = (event: React.MouseEvent<HTMLElement>) => {
    const { vertexKey, setViewModifier } = this.props;
    setViewModifier(vertexKey, EViewModifier.Hovered, event.type === 'mouseover');
  };

  render() {
    const { focalNodeUrl, isFocalNode, isPositioned, operation, service } = this.props;
    return (
      <div className="DdgNodeContent" onMouseOver={this.onMouseUx} onMouseOut={this.onMouseUx}>
        <div
          className={cx('DdgNodeContent--core', {
            'is-focalNode': isFocalNode,
            'is-positioned': isPositioned,
          })}
        >
          {isFocalNode && <div className="DdgNodeContent--focalMarker">{focalNodeIcon}</div>}
          <div>
            <h4 className="DdgNodeContent--label">{service}</h4>
            {operation && <div className="DdgNodeContent--label">{operation}</div>}
          </div>
        </div>

        <div className="DdgNodeContent--actionsWrapper">
          {focalNodeUrl && (
            <a href={focalNodeUrl} className="DdgNodeContent--actionsItem">
              {setFocusIcon}
              <span className="DdgNodeContent--actionsItemText">Set focus</span>
            </a>
          )}
          <a className="DdgNodeContent--actionsItem" onClick={this.viewTraces} role="button">
            <NewWindowIcon />
            <span className="DdgNodeContent--actionsItemText">View traces</span>
          </a>
        </div>
      </div>
    );
  }
}
