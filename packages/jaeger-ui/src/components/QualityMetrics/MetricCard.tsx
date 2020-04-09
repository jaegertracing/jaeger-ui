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
import { History as RouterHistory, Location } from 'history';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import queryString from 'query-string';

import * as jaegerApiActions from '../../actions/jaeger-api';
import JaegerAPI from '../../api/jaeger';
import BreakableText from '../common/BreakableText';

import { ReduxState } from '../../types';
import { TQualityMetrics } from './types';

type TOwnProps = {
  history: RouterHistory;
  location: Location;
}

type TDispatchProps = {
  fetchServices: () => void;
};

type TReduxProps = {
  service?: string;
  services?: string[] | null;
}

export type TProps = TDispatchProps & TReduxProps & TOwnProps;

type TState = {
  qualityMetrics?: TQualityMetrics;
  error?: Error;
  loading?: boolean;
};

export class UnconnectedQualityMetrics extends React.PureComponent<TProps, TState> {
  state: TState = {};

  componentDidMount() {
    this.fetchQualityMetrics();
  }

  componentDidUpdate(prevProps: TProps) {
    if (prevProps.service !== this.props.service) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        qualityMetrics: undefined,
        error: undefined,
        loading: false,
      });
      this.fetchQualityMetrics();
    }
  }

  fetchQualityMetrics() {
    const {
      service,
    } = this.props;
    if (!service) return;

    this.setState({ loading: true });

    JaegerAPI.fetchQualityMetrics(service)
      .then((qualityMetrics: TQualityMetrics) => {

        this.setState({ qualityMetrics, loading: false });
      })
      .catch((error: Error) => {
        this.setState({
          error,
          loading: false,
        });
      });
  }

  render() {
    const { service } = this.props;
    const { qualityMetrics, error, loading } = this.state;
    return (
      <div className="QualityMetrics">
        <div className="QualityMetrics--TitleHeader">
          Quality Metrics
        </div>
        {/*
        <div className="Ddg--DetailsPanel--DecorationHeader">
          <span>{stringSupplant(decorationSchema.name, { service, operation })}</span>
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
        <ColumnResizer max={0.8} min={0.1} onChange={this.onResize} position={width} rightSide />
        */}
      </div>
    );
  }
}

export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { services: stServices } = state;
  const { services } = stServices;
  const { service: serviceFromUrl } = queryString.parse(ownProps.location.search);
  const service = Array.isArray(serviceFromUrl) ? serviceFromUrl[0] : serviceFromUrl;
  return {
    service,
    services,
  };
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchServices } = bindActionCreators(
    jaegerApiActions,
    dispatch
  );

  return {
    fetchServices,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(UnconnectedQualityMetrics);
