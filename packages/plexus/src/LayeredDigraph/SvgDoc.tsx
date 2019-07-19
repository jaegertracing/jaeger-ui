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

import SvgDefEntry from './SvgDefEntry';
import { TSetOnContainer, TExposedGraphState, TDefEntry } from './types';
import { assignMergeCss, getProps } from './utils';
import TNonEmptyArray from '../types/TNonEmptyArray';
import ZoomManager from '../ZoomManager';

type TProps<T = {}, U = {}> = TSetOnContainer<T, U> & {
  classNamePrefix?: string;
  defs?: TNonEmptyArray<TDefEntry<T, U>>;
  graphState: TExposedGraphState<T, U>;
};

export default class SvgDoc<T = {}, U = {}> extends React.PureComponent<TProps<T, U>> {
  render() {
    const { children, classNamePrefix, defs, graphState, setOnContainer } = this.props;
    const { zoomTransform } = graphState;
    const containerProps = assignMergeCss(getProps(setOnContainer, graphState), {
      className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--SvgDoc`,
      style: { minHeight: '100%', minWidth: '100%' },
    });

    return (
      <svg {...containerProps}>
        {defs && (
          <defs>
            {defs.map(defEntry => (
              <SvgDefEntry<T, U>
                key={defEntry.localId}
                {...defEntry}
                classNamePrefix={classNamePrefix}
                graphState={graphState}
              />
            ))}
          </defs>
        )}
        <g
          className={`${classNamePrefix} ${classNamePrefix}-LayeredDigraph--SvgDoc--transformer`}
          transform={ZoomManager.getZoomAttr(zoomTransform)}
        >
          {children}
        </g>
      </svg>
    );
  }
}
