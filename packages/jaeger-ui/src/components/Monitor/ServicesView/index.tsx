// Copyright (c) 2021 The Jaeger Authors.
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
import { Row, Col, Input } from 'antd';
import { ActionFunction, Action } from 'redux-actions';
import _isEqual from 'lodash/isEqual';
// @ts-ignore
import { Field, formValueSelector, reduxForm } from 'redux-form';
// @ts-ignore
import store from 'store';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import VirtSelect from '../../common/VirtSelect';
import reduxFormFieldAdapter from '../../../utils/redux-form-field-adapter';
import * as jaegerApiActions from '../../../actions/jaeger-api';
import ServiceGraph from './serviceGraph';
import OperationTableDetails from './operationDetailsTable';
import LoadingIndicator from '../../common/LoadingIndicator';
import MonitorATMEmptyState from '../EmptyState';
import { ReduxState } from '../../../types';
import { MetricsAPIQueryParams, MetricsReduxState, ServiceOpsMetrics } from '../../../types/metrics';
import prefixUrl from '../../../utils/prefix-url';

import './index.css';

type StateType = {
  graphWidth: number;
  serviceOpsMetrics: ServiceOpsMetrics[] | undefined;
  searchOps: string;
};

type TReduxProps = {
  services: string[];
  servicesLoading: boolean;
  metrics: MetricsReduxState;
  selectedService: string;
  selectedTimeFrame: number;
};

type TProps = TReduxProps & TDispatchProps;

type TDispatchProps = {
  fetchServices: ActionFunction<Action<Promise<any>>>;
  fetchAggregatedServiceMetrics: ActionFunction<Action<Promise<any>>, string, MetricsAPIQueryParams>;
  fetchAllServiceMetrics: (serviceName: string, query: MetricsAPIQueryParams) => void;
};

const Search = Input.Search;

const AdaptedVirtualSelect = reduxFormFieldAdapter({
  AntInputComponent: VirtSelect,
  onChangeAdapter: option => (option ? (option as any).value : null),
});

const serviceFormSelector = formValueSelector('serviceForm');
const oneHourInMilliSeconds = 3600000;
const timeFrameOptions = [
  { label: 'Last Hour', value: oneHourInMilliSeconds },
  { label: 'Last 2 hour', value: 2 * oneHourInMilliSeconds },
  { label: 'Last 6 hour', value: 6 * oneHourInMilliSeconds },
  { label: 'Last 12 hour', value: 12 * oneHourInMilliSeconds },
  { label: 'Last 24 hours', value: 24 * oneHourInMilliSeconds },
  { label: 'Last 2 days', value: 48 * oneHourInMilliSeconds },
];

// export for tests
export const getLoopbackInterval = (interval: number) => {
  if (interval === undefined) return '';

  const timeFrameObj = timeFrameOptions.find(t => t.value === interval);

  if (timeFrameObj === undefined) return '';

  return timeFrameObj.label.toLowerCase();
};

// export for tests
export class MonitorATMServicesViewImpl extends React.PureComponent<TProps, StateType> {
  graphDivWrapper: React.RefObject<HTMLInputElement>;
  graphXDomain: number[];
  serviceSelectorValue: string = '';
  endTime: number = Date.now();
  state = {
    graphWidth: 300,
    serviceOpsMetrics: undefined,
    searchOps: '',
  };

  constructor(props: TProps) {
    super(props);
    this.graphDivWrapper = React.createRef();

    const currentTime = Date.now();
    this.graphXDomain = [currentTime - props.selectedTimeFrame, currentTime];
  }

  componentDidMount() {
    const { fetchServices, services } = this.props;
    fetchServices();
    if (services.length !== 0) {
      this.fetchMetrics();
    }
    window.addEventListener('resize', this.updateDimensions.bind(this));
    this.updateDimensions.apply(this);
  }

  componentDidUpdate(nextProps: TProps) {
    const { selectedService, selectedTimeFrame, services } = this.props;

    if (nextProps.selectedService !== selectedService || nextProps.selectedTimeFrame !== selectedTimeFrame) {
      this.fetchMetrics();
    } else if (!_isEqual(nextProps.services, services)) {
      this.fetchMetrics();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions.bind(this));
  }

  updateDimensions() {
    if (this.graphDivWrapper.current) {
      this.setState({
        graphWidth: this.graphDivWrapper.current.offsetWidth - 24,
      });
    }
  }

  fetchMetrics() {
    const {
      selectedService,
      selectedTimeFrame,
      fetchAllServiceMetrics,
      fetchAggregatedServiceMetrics,
      services,
    } = this.props;
    const currentService = selectedService || services[0];

    if (currentService) {
      this.endTime = Date.now();
      store.set('lastAtmSearchTimeframe', selectedTimeFrame);
      store.set('lastAtmSearchService', this.getSelectedService());

      const metricQueryPayload = {
        quantile: 0.95,
        endTs: this.endTime,
        lookback: selectedTimeFrame,
        step: 60 * 1000,
        ratePer: 10 * 60 * 1000,
      };

      fetchAllServiceMetrics(currentService, metricQueryPayload);
      fetchAggregatedServiceMetrics(currentService, metricQueryPayload);

      this.setState({ serviceOpsMetrics: undefined, searchOps: '' });
    }
  }

  getSelectedService() {
    const { selectedService, services } = this.props;
    return selectedService || store.get('lastAtmSearchService') || services[0];
  }

  render() {
    const { services, metrics, selectedTimeFrame, servicesLoading } = this.props;

    if (servicesLoading) {
      return <LoadingIndicator vcentered centered />;
    }

    if (metrics.isATMActivated === false) {
      return <MonitorATMEmptyState configureStatus={false} sendDataStatus={false} />;
    }

    return (
      <div className="service-view-container">
        <Row>
          <Col span={6}>
            <h2 className="service-selector-header">Choose service</h2>
            <Field
              name="service"
              component={AdaptedVirtualSelect}
              placeholder="Select A Service"
              props={{
                className: 'select-a-service-input',
                value: this.getSelectedService(),
                disabled: metrics.operationMetricsLoading,
                clearable: false,
                options: services.map((s: string) => ({ label: s, value: s })),
                required: true,
              }}
            />
          </Col>
        </Row>
        <Row>
          <Col span={16}>
            <p className="operations-metrics-text">
              Aggregation of all &quot;{this.getSelectedService()}&quot; metrics in selected timeframe.{' '}
              <a
                href={prefixUrl(
                  `/search?end=${Date.now()}000&limit=20&lookback=${selectedTimeFrame /
                    (3600 *
                      1000)}h&maxDuration&minDuration&service=${this.getSelectedService()}&start=${Date.now() -
                    selectedTimeFrame}000`
                )}
                target="blank"
              >
                View all traces
              </a>
            </p>
          </Col>
          <Col span={8} className="timeframe-selector">
            <Field
              name="timeframe"
              component={AdaptedVirtualSelect}
              placeholder="Select A Timeframe"
              props={{
                className: 'select-a-timeframe-input',
                defaultValue: timeFrameOptions[0],
                value: selectedTimeFrame,
                disabled: metrics.operationMetricsLoading,
                clearable: false,
                options: timeFrameOptions,
                required: true,
              }}
            />
          </Col>
        </Row>
        <Row>
          <Col span={8}>
            <div ref={this.graphDivWrapper} />
            <ServiceGraph
              key="latency"
              error={
                metrics.serviceError.service_latencies_50 &&
                metrics.serviceError.service_latencies_75 &&
                metrics.serviceError.service_latencies_95
              }
              loading={metrics.loading}
              name="Latency, ms"
              width={this.state.graphWidth}
              metricsData={metrics.serviceMetrics ? metrics.serviceMetrics.service_latencies : null}
              showLegend
              marginClassName="latency-margins"
              showHorizontalLines
              xDomain={this.graphXDomain}
            />
          </Col>
          <Col span={8}>
            <ServiceGraph
              key="errRate"
              error={metrics.serviceError.service_error_rate}
              loading={metrics.loading}
              name="Error rate, %"
              width={this.state.graphWidth}
              metricsData={metrics.serviceMetrics ? metrics.serviceMetrics.service_error_rate : null}
              marginClassName="error-rate-margins"
              color="#CD513A"
              yDomain={[0, 100]}
              xDomain={this.graphXDomain}
            />
          </Col>
          <Col span={8}>
            <ServiceGraph
              key="requests"
              loading={metrics.loading}
              error={metrics.serviceError.service_call_rate}
              name="Request rate, req/s"
              width={this.state.graphWidth}
              metricsData={metrics.serviceMetrics ? metrics.serviceMetrics.service_call_rate : null}
              showHorizontalLines
              color="#4795BA"
              marginClassName="request-margins"
              xDomain={this.graphXDomain}
            />
          </Col>
        </Row>
        <Row className="operation-table-block">
          <Row>
            <Col span={16}>
              <h2 className="table-header">Operations metrics under {this.getSelectedService()}</h2>{' '}
              <span className="over-the-last">Over the {getLoopbackInterval(selectedTimeFrame)}</span>
            </Col>
            <Col span={8} className="select-operation-column">
              <Search
                placeholder="Search operation"
                className="select-operation-input"
                value={this.state.searchOps}
                disabled={metrics.operationMetricsLoading === true || metrics.serviceOpsMetrics === undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const filteredData = metrics.serviceOpsMetrics!.filter(({ name }: { name: string }) => {
                    return name.toLowerCase().includes(e.target.value.toLowerCase());
                  });

                  this.setState({ searchOps: e.target.value });

                  this.setState({
                    serviceOpsMetrics: filteredData,
                  });
                }}
              />
            </Col>
          </Row>
          <Row>
            <OperationTableDetails
              loading={metrics.operationMetricsLoading}
              error={metrics.opsError}
              data={
                this.state.serviceOpsMetrics === undefined
                  ? metrics.serviceOpsMetrics
                  : this.state.serviceOpsMetrics
              }
              endTime={this.endTime}
              lookback={selectedTimeFrame}
              serviceName={this.getSelectedService()}
            />
          </Row>
        </Row>
      </div>
    );
  }
}

export function mapStateToProps(state: ReduxState): TReduxProps {
  const { services, metrics } = state;
  return {
    services: services.services || [],
    servicesLoading: services.loading,
    metrics,
    selectedService: serviceFormSelector(state, 'service') || store.get('lastAtmSearchService'),
    selectedTimeFrame:
      serviceFormSelector(state, 'timeframe') || store.get('lastAtmSearchTimeframe') || oneHourInMilliSeconds,
  };
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchServices, fetchAllServiceMetrics, fetchAggregatedServiceMetrics } = bindActionCreators<any>(
    jaegerApiActions,
    dispatch
  );

  return {
    fetchServices,
    fetchAllServiceMetrics,
    fetchAggregatedServiceMetrics,
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(
  reduxForm({
    form: 'serviceForm',
  })(MonitorATMServicesViewImpl)
);
