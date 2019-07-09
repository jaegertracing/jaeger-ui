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
import { EViewModifier } from '../../../model/ddg/types';

import './DdgNode.css';

type TProps = {
  vertexKey: string;
  service: string;
  operation: string | null;
  focalNodeUrl: string | null;
  isFocalNode: boolean;
  viewModifiers: number;
  setViewModifier: (vertexKey: string, viewModifier: EViewModifier, isEnabled: boolean) => void;
};

export default class DdgNode extends React.PureComponent<TProps> {
  onMouseUx = (event: React.MouseEvent<HTMLElement>) => {
    const { vertexKey, setViewModifier } = this.props;
    setViewModifier(vertexKey, EViewModifier.Hovered, event.type === 'mouseover');
  };

  render() {
    const { focalNodeUrl, isFocalNode, operation, service } = this.props;
    return (
      <div className="DdgNode" onMouseOver={this.onMouseUx} onMouseOut={this.onMouseUx}>
        <div className={cx('DdgNode--core', { 'is-focalNode': isFocalNode })}>
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
          <a className="DdgNode--actionsItem">
            <NewWindowIcon />
            <span className="DdgNode--actionsItemText">View traces</span>
          </a>
        </div>
      </div>
    );
  }
}
