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

import React, { Component } from 'react';
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';
import _map from 'lodash/map';
import _takeWhile from 'lodash/takeWhile';
import { History as RouterHistory, Location } from 'history';
import queryString from 'query-string';

import DdgEVManager from '../../model/ddg/DdgEVManager';
import { TDdgModel } from '../../model/ddg/types';
import { createKey } from '../../model/ddg/visibility-key';

type TProps = {
  history: RouterHistory;
  location: Location;
  ddgModel: TDdgModel,
  visKey?: string,
}

export default class Graph extends Component<TProps> {
  private ddgEVManager: DdgEVManager;
  private layoutManager: LayoutManager;

  constructor(props: TProps) {
    super(props);
    const { ddgModel } = props;
    this.ddgEVManager = new DdgEVManager({ ddgModel });
    this.layoutManager = new LayoutManager({ useDotEdges: true, splines: 'polyline' });

    if (!this.props.visKey) {
      const indices = _map(
        _takeWhile(ddgModel.visIdxToPathElem, ({ distance }) => Math.abs(distance) < 3),
        'visibilityIdx'
      );
      const visibilityKey = createKey(indices);
      const readOnlyQueryParams = queryString.parse(this.props.location.search);
      const queryParams = Object.assign({}, readOnlyQueryParams, { visibilityKey });
      this.props.history.replace({
        ...this.props.location,
        search: `?${queryString.stringify(queryParams)}`,
      });
    }
  }

  render() {
    if (!this.props.visKey) {
      return <h1>Calculating Initial Graph</h1>;
    }
    const { edges, vertices } = this.ddgEVManager.getEdgesAndVertices(this.props.visKey);

    return <DirectedGraph
      minimap
      zoom
      arrowScaleDampener={0}
      minimapClassName="TraceDiffGraph--miniMap"
      layoutManager={this.layoutManager}
      edges={edges}
      vertices={vertices}
    />
  }
}
