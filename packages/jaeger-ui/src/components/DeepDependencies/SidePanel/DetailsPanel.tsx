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
import { Tooltip } from 'antd';
import _get from 'lodash/get';
import { connect } from 'react-redux';

import BreakableText from '../../common/BreakableText';
import DetailsCard from '../../common/DetailsCard';
import LoadingIndicator from '../../common/LoadingIndicator';
import NewWindowIcon from '../../common/NewWindowIcon';
import VerticalResizer from '../../common/VerticalResizer';
import JaegerAPI from '../../../api/jaeger';
import extractDecorationFromState, { TDecorationFromState } from '../../../model/path-agnostic-decorations';
import stringSupplant from '../../../utils/stringSupplant';

import { TPathAgnosticDecorationSchema } from '../../../model/path-agnostic-decorations/types';
import { TColumnDefs, TDetails } from '../../common/DetailsCard/types';

import './DetailsPanel.css';

type TProps = TDecorationFromState & {
  decorationSchema: TPathAgnosticDecorationSchema;
  service: string;
  operation?: string | string[] | null;
};

type TState = {
  columnDefs?: TColumnDefs;
  details?: TDetails;
  detailsErred?: boolean;
  detailsLoading?: boolean;
  width?: number;
};

export class UnconnectedDetailsPanel extends React.PureComponent<TProps, TState> {
  state: TState = {};

  componentDidMount() {
    this.fetchDetails();
  }

  componentDidUpdate(prevProps: TProps) {
    if (
      prevProps.operation !== this.props.operation ||
      prevProps.service !== this.props.service ||
      prevProps.decorationSchema !== this.props.decorationSchema
    ) {
      this.setState({
        details: undefined,
        detailsErred: false,
        detailsLoading: false,
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
    } = this.props;

    const operation = _op && !Array.isArray(_op) ? _op : undefined;

    let fetchUrl: string | undefined;
    let getDetailPath: string | undefined;
    let getDefPath: string | undefined;
    if (opDetailUrl && opDetailPath && operation) {
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
      .then((res: unknown) => {
        let detailsErred = false;
        let details = _get(res, getDetailPath as string);
        if (details === undefined) {
          details = `\`${getDetailPath}\` not found in response`;
          detailsErred = true;
        }
        const columnDefs: TColumnDefs = getDefPath ? _get(res, getDefPath, []) : [];

        this.setState({ columnDefs, details, detailsErred, detailsLoading: false });
      })
      .catch((err: Error) => {
        this.setState({
          details: `Unable to fetch decoration: ${err.message || err}`,
          detailsErred: true,
          detailsLoading: false,
        });
      });
  }

  onResize = (width: number) => {
    this.setState({ width });
  };

  render() {
    const { decorationProgressbar, decorationSchema, decorationValue, operation: _op, service } = this.props;
    const { detailLink } = decorationSchema;
    const { width = 0.3 } = this.state;
    const operation = _op && !Array.isArray(_op) ? _op : undefined;
    return (
      <div className="Ddg--DetailsPanel" style={{ width: `${width * 100}vw` }}>
        <div className="Ddg--DetailsPanel--SvcOpHeader">
          <BreakableText text={service} />
          {operation && <BreakableText text={`::${operation}`} />}
        </div>
        <div className="Ddg--DetailsPanel--DecorationHeader">
          <span>{stringSupplant(decorationSchema.name, { service, operation })}</span>
          {detailLink && (
            <Tooltip arrowPointAtCenter title="More Info">
              <a
                className="Ddg--DetailsPanel--DetailLink"
                href={stringSupplant(detailLink, { service, operation })}
                target="_blank"
                rel="noreferrer noopener"
              >
                <NewWindowIcon />
              </a>
            </Tooltip>
          )}
        </div>
        {decorationProgressbar ? (
          <div className="Ddg--DetailsPanel--PercentCircleWrapper">{decorationProgressbar}</div>
        ) : (
          <span className="Ddg--DetailsPanel--errorMsg">{decorationValue}</span>
        )}
        {this.state.detailsLoading && (
          <div className="Ddg--DetailsPanel--LoadingWrapper">
            <LoadingIndicator className="Ddg--DetailsPanel--LoadingIndicator" />
          </div>
        )}
        {this.state.details && (
          <DetailsCard
            className={`Ddg--DetailsPanel--DetailsCard ${this.state.detailsErred ? 'is-error' : ''}`}
            columnDefs={this.state.columnDefs}
            details={this.state.details}
            header="Details"
          />
        )}
        <VerticalResizer max={0.8} min={0.1} onChange={this.onResize} position={width} rightSide />
      </div>
    );
  }
}

export default connect(extractDecorationFromState)(UnconnectedDetailsPanel);
