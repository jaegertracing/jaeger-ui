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

import focalNodeIcon from './focalNodeIcon';
import setFocusButtonIcon from './setFocusButtonIcon';
import NewWindowIcon from '../../common/NewWindowIcon';
import { getUrl as getSearchUrl } from '../../SearchTracePage/url';
import { EViewModifier, PathElem } from '../../../model/ddg/types';

import './DdgNode.css';

type TProps = {
  vertexKey: string;
  service: string;
  operation: string | null;
  focalNodeUrl: string | null;
  getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined;
  isFocalNode: boolean;
  isUiFindMatch: boolean;
  viewModifiers: number;
  setViewModifier: (vertexKey: string, viewModifier: EViewModifier, isEnabled: boolean) => void;
};

// While browsers suport URLs of unlimited length, many server clients do not handle more than this max
const MAX_LENGTH = 2083;
const MIN_LENGTH = getSearchUrl().length;
const PARAM_NAME_LENGTH = '&traceID='.length;

export default class DdgNode extends React.PureComponent<TProps> {
  viewTraces = () => {
    const { vertexKey, getVisiblePathElems } = this.props;
    const elems = getVisiblePathElems(vertexKey);
    if (elems) {
      const ids: Set<string> = new Set();
      let currLength = MIN_LENGTH;
      for (let i = 0; i < elems.length; i++) {
        const id = elems[i].memberOf.traceID;
        // Keep track of the length, then break if it is too long, to avoid opening a tab with a URL that the
        // backend cannot process, even if there are more traceIDs
        currLength += PARAM_NAME_LENGTH + id.length;
        if (currLength > MAX_LENGTH) break;
        ids.add(id);
      }
      window.open(getSearchUrl({ traceID: Array.from(ids) }), '_blank');
    }
  };

  onMouseUx = (event: React.MouseEvent<HTMLElement>) => {
    const { vertexKey, setViewModifier } = this.props;
    setViewModifier(vertexKey, EViewModifier.Hovered, event.type === 'mouseover');
  };

  render() {
    const { focalNodeUrl, isFocalNode, isUiFindMatch, operation, service } = this.props;
    return (
      <div className="DdgNode" onMouseOver={this.onMouseUx} onMouseOut={this.onMouseUx}>
        <div
          className={cx('DdgNode--core', { 'is-focalNode': isFocalNode, 'is-UiFindMatch': isUiFindMatch })}
        >
          {isFocalNode && <div className="DdgNode--focalMarker">{focalNodeIcon}</div>}
          <div>
            <h4 className="DdgNode--label">{service}</h4>
            {operation && <div className="DdgNode--label">{operation}</div>}
          </div>
        </div>

        <div className="DdgNode--actionsWrapper">
          {focalNodeUrl && (
            <a href={focalNodeUrl} className="DdgNode--actionsItem">
              {setFocusButtonIcon}
              <span className="DdgNode--actionsItemText">Set focus</span>
            </a>
          )}
          <a className="DdgNode--actionsItem" onClick={this.viewTraces}>
            <NewWindowIcon />
            <span className="DdgNode--actionsItemText">View traces</span>
          </a>
        </div>
      </div>
    );
  }
}
