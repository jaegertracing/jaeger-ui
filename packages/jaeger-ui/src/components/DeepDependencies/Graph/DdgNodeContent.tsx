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
import { EViewModifier, TDdgVertex } from '../../../model/ddg/types';

import './DdgNodeContent.css';

type TProps = {
  vertexKey: string;
  service: string;
  operation: string | null;
  focalNodeUrl: string | null;
  isFocalNode: boolean;
  isPositioned: boolean;
  viewModifiers: number;
  setViewModifier: (vertexKey: string, viewModifier: EViewModifier, isEnabled: boolean) => void;
};

// temp fill in props
/* istanbul ignore next */
const noops = {
  setViewModifier(vertexKey: string, viewModifier: EViewModifier, enabled: boolean) {
    // eslint-disable-next-line no-console
    console.log(`set view modifier: ${enabled ? 'on' : 'OFF'} ${viewModifier} -- ${vertexKey}`);
  },
};

export default class DdgNodeContent extends React.PureComponent<TProps> {
  static measureNode(_: TVertex<any>, utils: TMeasureNodeUtils) {
    const { height, width } = utils.getWrapperSize();
    return {
      height: height + 2,
      width: width + 2,
    };
  }

  static renderNode(vertex: TDdgVertex, utils: TRendererUtils, lv: TLayoutVertex<any> | null) {
    const { isFocalNode, key, operation, service } = vertex;
    return (
      <DdgNodeContent
        vertexKey={key}
        service={service}
        operation={operation}
        isFocalNode={isFocalNode}
        isPositioned={Boolean(lv)}
        viewModifiers={0}
        focalNodeUrl={isFocalNode ? null : getUrl({ operation, service })}
        {...noops}
      />
    );
  }

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
          <a className="DdgNodeContent--actionsItem">
            <NewWindowIcon />
            <span className="DdgNodeContent--actionsItemText">View traces</span>
          </a>
        </div>
      </div>
    );
  }
}
