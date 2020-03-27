// Copyright (c) 2020 Uber Technologies, Inc.
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
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

import {
  TDdgVertex,
} from '../../../model/ddg/types';
import { TPathAgnosticDecorationSchema } from '../../../model/path-agnostic-decorations/types';
import { getConfigValue } from '../../../utils/config/get-config';
import DetailsPanel from './DetailsPanel';


type TProps = {
  clearSelected: () => void;
  selectDecoration: (decoration?: string) => void;
  selectedDecoration?: string;
  selectedVertex?: TDdgVertex;
};

type TState = {
  collapsed: boolean;
};

export default class SidePanel extends React.PureComponent<TProps, TState> {
  state = {
    collapsed: false,
  };

  decorations: TPathAgnosticDecorationSchema[] | undefined;

  constructor(props: TProps) {
    super(props);

    this.decorations = getConfigValue('pathAgnosticDecorations');
  }

  render() {
    if (!this.decorations) return null;

    const {
      clearSelected,
      selectDecoration,
      selectedDecoration,
      selectedVertex,
    } = this.props;

    const selectedSchema = this.decorations.find(({ id }) => id === selectedDecoration);

    return (
      <div className="Ddg--SidePanel">
        <div className="Ddg--SidePanel--Btns">
          {this.decorations.map(({ acronym, id, name }) => (
            <button
              key={id}
              className={`Ddg--SidePanel--decorationBtn ${id === selectedDecoration ? 'is-selected' : ''}`}
              onClick={() => selectDecoration(id)}
            >
              {acronym}
            </button>
          ))}
            <button
              key="clearBtn"
              className="Ddg--SidePanel--decorationBtn"
              onClick={() => selectDecoration()}
            >
              X
            </button>
        </div>
        <div className={`Ddg--SidePanel--Details ${selectedVertex ? '.is-expanded' : ''}`}>
          {selectedVertex && selectedSchema && <DetailsPanel
            decorationSchema={selectedSchema}
            operation={selectedVertex.operation}
            service={selectedVertex.service}
          />}
        </div>
      </div>
    );
  }
}

/*
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { services: stServices } = state;
  const { services, serverOpsForService } = stServices;
  const urlState = getUrlState(ownProps.location.search);
  const { density, operation, service, showOp: urlStateShowOp } = urlState;
  const showOp = urlStateShowOp !== undefined ? urlStateShowOp : operation !== undefined;
  let graphState: TDdgStateEntry | undefined;
  if (service) {
    graphState = _get(state.ddg, getStateEntryKey({ service, operation, start: 0, end: 0 }));
  }
  let graph: GraphModel | undefined;
  if (graphState && graphState.state === fetchedState.DONE) {
    graph = makeGraph(graphState.model, showOp, density);
  }
  return {
    graph,
    graphState,
    serverOpsForService,
    services,
    showOp,
    urlState: sanitizeUrlState(urlState, _get(graphState, 'model.hash')),
    ...extractUiFindFromState(state),
  };
}
*/
