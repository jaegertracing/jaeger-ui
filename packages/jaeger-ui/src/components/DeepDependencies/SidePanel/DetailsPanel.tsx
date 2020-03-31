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
import _get from 'lodash/get';
import { connect } from 'react-redux';

import BreakableText from '../../../components/common/BreakableText';
import ColumnResizer from '../../../components/TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineColumnResizer';
import JaegerAPI from '../../../api/jaeger';
import extractDecorationFromState, { TDecorationFromState } from '../../../model/path-agnostic-decorations';
import { TPathAgnosticDecorationSchema, TPadColumnDefs, TPadDetails } from '../../../model/path-agnostic-decorations/types';
import stringSupplant from '../../../utils/stringSupplant';
import DetailsCard from './DetailsCard';

import './DetailsPanel.css';


type TProps = TDecorationFromState & {
  decorationSchema: TPathAgnosticDecorationSchema;
  service: string;
  operation?: string | string[] | null;
};

type TState = {
  columnDefs?: TPadColumnDefs;
  details?: TPadDetails;
  detailsErred?: boolean;
  detailsLoading?: boolean;
  width?: number;
};

export class UnconnectedDetailsPanel extends React.PureComponent<TProps, TState> {
  state = {} as TState; 

  componentDidMount() {
    this.fetchDetails();
  }

  componentDidUpdate(prevProps: TProps) {
    if (prevProps.operation !== this.props.operation
      || prevProps.service !== this.props.service
      || prevProps.decorationSchema !== this.props.decorationSchema
    ) {
      console.log('clearing state');
      this.setState({
        details: undefined,
        detailsErred: undefined,
        detailsLoading: undefined,
      });
      this.fetchDetails();
    }
  }

  fetchDetails() {
    const {
      decorationSchema: {
        detailUrl,
        detailPath,
        detailColumnDefPath,
        opDetailUrl,
        opDetailPath,
        opDetailColumnDefPath,
      },
      operation: _op,
      service,
    }= this.props;

    const operation = _op && !Array.isArray(_op) ? _op : undefined;

    let fetchUrl: string | undefined;
    let getDetailPath: string | undefined;
    let getDefPath: string | undefined;
    if (opDetailUrl && opDetailPath) {
      fetchUrl = stringSupplant(opDetailUrl, { service, operation });
      getDetailPath = stringSupplant(opDetailPath, { service, operation });
      getDefPath = opDetailColumnDefPath && stringSupplant(opDetailColumnDefPath, { service, operation });
    } else if (detailUrl && detailPath) {
      fetchUrl = stringSupplant(detailUrl, { service });
      getDetailPath = stringSupplant(detailPath, { service });
      getDefPath = detailColumnDefPath && stringSupplant(detailColumnDefPath, { service });
    }

    if (!fetchUrl || !getDetailPath) return;

    this.setState({ detailsLoading: true });

    JaegerAPI.fetchDecoration(fetchUrl)
      .then(res => {
        const details = _get(res, (getDetailPath as string), `\`${getDetailPath}\` not found in response`);
        const columnDefs: TPadColumnDefs = getDefPath
          ? _get(res, getDefPath, [])
          : [];
        this.setState({ details, columnDefs })


      })
      .catch(err => {
        this.setState({
          details: `Unable to fetch decoration: ${err.message || err}`,
          detailsErred: true,
        });
      })
  }

  onResize = (width: number) => {
    this.setState({ width });
  }

  render() {
    const { decorationProgressbar, decorationColor, decorationMax, decorationSchema, decorationValue, operation: _op, service } = this.props;
    const { width = 0.3 } = this.state;
    const operation = _op && !Array.isArray(_op) ? _op : undefined;
    return (
      <div className="Ddg--DetailsPanel" style={{ width: `${width * 100}vw` }}>
        <div>
          <div className="Ddg--DetailsPanel--SvcOpHeader">
            <BreakableText text={service} />{operation && <BreakableText text={`::${operation}`} />}
          </div>
          <div className="Ddg--DetailsPanel--DecorationHeader">
            <span>{stringSupplant(decorationSchema.name, { service, operation })}</span>
          </div>
          {decorationProgressbar || (<span className="Ddg-DetailsPanel--errorMsg">{decorationValue}</span>)}
          {this.state.details && (
            <DetailsCard
              header="Details"
              details={this.state.details}
              columnDefs={this.state.columnDefs}
            />
          )}
        </div>
        <ColumnResizer
          max={.80}
          min={.20}
          position={width}
          rightSide
          onChange={this.onResize}
        />
      </div>
    )
  }
}

export default connect(extractDecorationFromState)(UnconnectedDetailsPanel);
