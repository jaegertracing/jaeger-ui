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
import MdExitToApp from 'react-icons/lib/md/exit-to-app';
import MdInfoOutline from 'react-icons/lib/md/info-outline';

import 'react-circular-progressbar/dist/styles.css';


import {
  TDdgVertex,
} from '../../../model/ddg/types';
import { TPathAgnosticDecorationSchema } from '../../../model/path-agnostic-decorations/types';
import { getConfigValue } from '../../../utils/config/get-config';
import DetailsPanel from './DetailsPanel';

import './index.css';


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

  clearSelected = () => {
    this.props.clearSelected();
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
          <button className={`Ddg--SidePanel--closeBtn ${selectedVertex && selectedSchema ? '' : 'is-hidden'}`} onClick={this.clearSelected}>
            <MdExitToApp />
          </button>
          <div className="Ddg--SidePanel--DecorationBtns">
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
              Clear 
            </button>
          </div>
          <button className="Ddg--SidePanel--infoBtn">
            <MdInfoOutline />
          </button>
        </div>
        <div className={`Ddg--SidePanel--Details ${selectedVertex && selectedSchema ? '.is-expanded' : ''}`}>
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
