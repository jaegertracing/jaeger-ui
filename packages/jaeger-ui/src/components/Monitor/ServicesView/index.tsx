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

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Input, Alert, Select } from 'antd';
import { ActionFunction, Action } from 'redux-actions';
import _debounce from 'lodash/debounce';
import _isEqual from 'lodash/isEqual';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore
import store from 'store';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Link } from 'react-router-dom';
import * as jaegerApiActions from '../../../actions/jaeger-api';
import ServiceGraph from './serviceGraph';
import OperationTableDetails from './operationDetailsTable';
import LoadingIndicator from '../../common/LoadingIndicator';
import MonitorATMEmptyState from '../EmptyState';
import { ReduxState } from '../../../types';
import {
  MetricsAPIQueryParams,
  MetricsReduxState,
  Points,
  ServiceMetricsObject,
  ServiceOpsMetrics,
  spanKinds,
} from '../../../types/metrics';
import prefixUrl from '../../../utils/prefix-url';
import { convertToTimeUnit, convertTimeUnitToShortTerm, getSuitableTimeUnit } from '../../../utils/date';

import './index.css';
import { getConfigValue } from '../../../utils/config/get-config';
import {
  trackSearchOperation,
  trackSelectService,
  trackSelectSpanKind,
  trackSelectTimeframe,
  trackViewAllTraces,
} from './index.track';
import withRouteProps from '../../../utils/withRouteProps';
import SearchableSelect from '../../common/SearchableSelect';

type StateType = {
  graphWidth: number;
  serviceOpsMetrics: ServiceOpsMetrics[] | undefined;
  searchOps: string;
  graphXDomain: number[];
  selectedService: string;
  selectedSpanKind: spanKinds;
  selectedTimeFrame: number;
};

type TReduxProps = {
  services: string[];
  servicesLoading: boolean;
  metrics: MetricsReduxState;
};

type TProps = TReduxProps & TDispatchProps;

type TDispatchProps = {
  fetchServices: ActionFunction<Action<Promise<any>>>;
  fetchAggregatedServiceMetrics: ActionFunction<Action<Promise<any>>, string, MetricsAPIQueryParams>;
  fetchAllServiceMetrics: (serviceName: string, query: MetricsAPIQueryParams) => void;
};

const trackSearchOperationDebounced = _debounce(searchQuery => trackSearchOperation(searchQuery), 1000);

const Search = Input.Search;
const Option = Select.Option;

const oneHourInMilliSeconds = 3600000;
const oneMinuteInMilliSeconds = 60000;
export const timeFrameOptions = [
  { label: 'Last 5 minutes', value: 5 * oneMinuteInMilliSeconds },
  { label: 'Last 15 minutes', value: 15 * oneMinuteInMilliSeconds },
  { label: 'Last 30 minutes', value: 30 * oneMinuteInMilliSeconds },
  { label: 'Last Hour', value: oneHourInMilliSeconds },
  { label: 'Last 2 hours', value: 2 * oneHourInMilliSeconds },
  { label: 'Last 6 hours', value: 6 * oneHourInMilliSeconds },
  { label: 'Last 12 hours', value: 12 * oneHourInMilliSeconds },
  { label: 'Last 24 hours', value: 24 * oneHourInMilliSeconds },
  { label: 'Last 2 days', value: 48 * oneHourInMilliSeconds },
];
export const spanKindOptions = [
  { label: 'Client', value: 'client' },
  { label: 'Server', value: 'server' },
  { label: 'Internal', value: 'internal' },
  { label: 'Producer', value: 'producer' },
  { label: 'Consumer', value: 'consumer' },
];

// export for tests
export const getLoopbackInterval = (interval: number) => {
  if (interval === undefined) return '';

  const timeFrameObj = timeFrameOptions.find(t => t.value === interval);

  if (timeFrameObj === undefined) return '';

  return timeFrameObj.label.toLowerCase();
};

const calcDisplayTimeUnit = (serviceLatencies: ServiceMetricsObject | ServiceMetricsObject[] | null) => {
  let maxValue = 0;

  if (serviceLatencies && Array.isArray(serviceLatencies)) {
    const allMaxMetrics = serviceLatencies.map(x => x.max);
    maxValue = Math.max(...allMaxMetrics);
  } else if (serviceLatencies) {
    maxValue = serviceLatencies.max;
  }

  return getSuitableTimeUnit(maxValue * 1000);
};

// export for tests
export const yAxisTickFormat = (timeInMS: number, displayTimeUnit: string) =>
  convertToTimeUnit(timeInMS * 1000, displayTimeUnit);

const convertServiceErrorRateToPercentages = (serviceErrorRate: null | ServiceMetricsObject) => {
  if (!serviceErrorRate) return null;

  const convertedMetricsPoints = serviceErrorRate.metricPoints.map((metricPoint: Points) => {
    const y = metricPoint.y;

    if (y === null || y === undefined || Number.isNaN(y)) {
      return { ...metricPoint, y: null };
    }

    return { ...metricPoint, y: y * 100 };
  });

  return { ...serviceErrorRate, metricPoints: convertedMetricsPoints };
};

// export for tests
export const MonitorATMServicesViewImpl: React.FC<TProps> = props => {
  const docsLink = getConfigValue('monitor.docsLink');
  const graphDivWrapper = useRef<HTMLDivElement>(null);
  const serviceSelectorValue = '';
  const [endTime, setEndTime] = useState<number>(Date.now());
  const [graphWidth, setGraphWidth] = useState<number>(300);
  const [serviceOpsMetrics, setServiceOpsMetrics] = useState<ServiceOpsMetrics[] | undefined>(undefined);
  const [searchOps, setSearchOps] = useState<string>('');
  const [graphXDomain, setGraphXDomain] = useState<number[]>([]);
  const [selectedService, setSelectedService] = useState<string>(store.get('lastAtmSearchService') || '');
  const [selectedSpanKind, setSelectedSpanKind] = useState<spanKinds>(
    store.get('lastAtmSearchSpanKind') || 'server'
  );
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<number>(
    store.get('lastAtmSearchTimeframe') || oneHourInMilliSeconds
  );

  const calcGraphXDomain = useCallback(() => {
    const currentTime = Date.now();
    setGraphXDomain([currentTime - selectedTimeFrame, currentTime]);
  }, [selectedTimeFrame]);

  const updateDimensions = useCallback(() => {
    if (graphDivWrapper.current) {
      setGraphWidth(graphDivWrapper.current.offsetWidth - 24);
    }
  }, []);

  const getSelectedService = useCallback(() => {
    const { services } = props;
    return selectedService || store.get('lastAtmSearchService') || services[0];
  }, [props.services, selectedService]);

  const handleServiceChange = useCallback((value: string) => {
    setSelectedService(value);
    trackSelectService(value);
  }, []);

  const handleSpanKindChange = useCallback((value: string) => {
    setSelectedSpanKind(value as spanKinds);
    const { label } = spanKindOptions.find(option => option.value === value)!;
    trackSelectSpanKind(label);
  }, []);

  const handleTimeFrameChange = useCallback((value: number) => {
    setSelectedTimeFrame(value);
    const { label } = timeFrameOptions.find(option => option.value === value)!;
    trackSelectTimeframe(label);
  }, []);

  const fetchMetrics = useCallback(() => {
    const { fetchAllServiceMetrics, fetchAggregatedServiceMetrics, services } = props;
    const currentService = selectedService || services[0];

    if (currentService) {
      const newEndTime = Date.now();
      setEndTime(newEndTime);
      store.set('lastAtmSearchSpanKind', selectedSpanKind);
      store.set('lastAtmSearchTimeframe', selectedTimeFrame);
      store.set('lastAtmSearchService', currentService);

      const metricQueryPayload = {
        quantile: 0.95,
        endTs: newEndTime,
        lookback: selectedTimeFrame,
        step: 60 * 1000,
        ratePer: 10 * 60 * 1000,
        spanKind: selectedSpanKind,
      };

      fetchAllServiceMetrics(currentService, metricQueryPayload);
      fetchAggregatedServiceMetrics(currentService, metricQueryPayload);

      setServiceOpsMetrics(undefined);
      setSearchOps('');
    }
  }, [props, selectedService, selectedSpanKind, selectedTimeFrame]);

  // componentDidMount equivalent
  useEffect(() => {
    const { fetchServices } = props;
    fetchServices();
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    calcGraphXDomain();

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions, calcGraphXDomain]);

  // componentDidUpdate equivalent
  useEffect(() => {
    const { services } = props;
    if (services.length !== 0) {
      fetchMetrics();
    }
  }, [props.services, fetchMetrics]);

  useEffect(() => {
    calcGraphXDomain();
  }, [selectedTimeFrame, calcGraphXDomain]);


  useEffect(() => {
    fetchMetrics();
  }, [selectedService, selectedSpanKind, selectedTimeFrame, fetchMetrics]);


  const { services, metrics, servicesLoading } = props;
  const serviceLatencies = metrics.serviceMetrics ? metrics.serviceMetrics.service_latencies : null;
  const displayTimeUnit = calcDisplayTimeUnit(serviceLatencies);
  const serviceErrorRate = metrics.serviceMetrics ? metrics.serviceMetrics.service_error_rate : null;

  if (servicesLoading) {
    return <LoadingIndicator vcentered centered />;
  }

  if (metrics.isATMActivated === false) {
    return <MonitorATMEmptyState />;
  }

  return (
    <>
      {_isEmpty(metrics && metrics.serviceMetrics && metrics.serviceMetrics.service_latencies) && (
        <Alert
          message={
            <>
              No data yet! Please see these
              <Link to={{ pathname: docsLink }} target="_blank">
                &nbsp;instructions&nbsp;
              </Link>
              on how to set up your span metrics.
            </>
          }
          type="warning"
          showIcon
        />
      )}
      <div className="service-view-container">
        <Row>
          <Col span={6}>
            <h2 className="service-selector-header">Service</h2>
            <SearchableSelect
              value={getSelectedService()}
              onChange={handleServiceChange}
              placeholder="Select A Service"
              className="select-a-service-input"
              disabled={metrics.operationMetricsLoading}
              loading={metrics.operationMetricsLoading}
            >
              {services.map((service: string) => (
                <Option key={service} value={service}>
                  {service}
                </Option>
              ))}
            </SearchableSelect>
          </Col>
          <Col span={6}>
            <h2 className="span-kind-selector-header">Span Kind</h2>
            <SearchableSelect
              value={selectedSpanKind}
              onChange={handleSpanKindChange}
              placeholder="Select A Span Kind"
              className="span-kind-selector"
              disabled={metrics.operationMetricsLoading}
              loading={metrics.operationMetricsLoading}
            >
              {spanKindOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </SearchableSelect>
          </Col>
        </Row>
        <Row align="middle">
          <Col span={16}>
            <p className="operations-metrics-text">
              Aggregation of all &quot;{getSelectedService()}&quot; metrics in selected timeframe.{' '}
              <a
                href={prefixUrl(
                  `/search?end=${Date.now()}000&limit=20&lookback=${
                    selectedTimeFrame / (3600 * 1000)
                  }h&maxDuration&minDuration&service=${getSelectedService()}&start=${
                    Date.now() - selectedTimeFrame
                  }000`
                )}
                target="blank"
                onClick={trackViewAllTraces}
              >
                View all traces
              </a>
            </p>
          </Col>
          <Col span={8} className="timeframe-selector">
            <SearchableSelect
              value={selectedTimeFrame}
              onChange={handleTimeFrameChange}
              placeholder="Select A Timeframe"
              className="select-a-timeframe-input"
              disabled={metrics.operationMetricsLoading}
              loading={metrics.operationMetricsLoading}
            >
              {timeFrameOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </SearchableSelect>
          </Col>
        </Row>
        <Row>
          <Col span={8}>
            <div ref={graphDivWrapper} />
            <ServiceGraph
              key="latency"
              error={
                metrics.serviceError.service_latencies_50 &&
                metrics.serviceError.service_latencies_75 &&
                metrics.serviceError.service_latencies_95
              }
              loading={metrics.loading}
              name={`Latency (${convertTimeUnitToShortTerm(displayTimeUnit)})`}
              width={graphWidth}
              metricsData={serviceLatencies}
              showLegend
              marginClassName="latency-margins"
              showHorizontalLines
              yAxisTickFormat={timeInMs => yAxisTickFormat(timeInMs, displayTimeUnit)}
              xDomain={graphXDomain}
            />
          </Col>
          <Col span={8}>
            <ServiceGraph
              key="errRate"
              error={metrics.serviceError.service_error_rate}
              loading={metrics.loading}
              name="Error rate (%)"
              width={graphWidth}
              metricsData={convertServiceErrorRateToPercentages(serviceErrorRate)}
              marginClassName="error-rate-margins"
              color="#CD513A"
              yDomain={[0, 100]}
              xDomain={graphXDomain}
            />
          </Col>
          <Col span={8}>
            <ServiceGraph
              key="requests"
              loading={metrics.loading}
              error={metrics.serviceError.service_call_rate}
              name="Request rate (req/s)"
              width={graphWidth}
              metricsData={metrics.serviceMetrics ? metrics.serviceMetrics.service_call_rate : null}
              showHorizontalLines
              color="#4795BA"
              marginClassName="request-margins"
              xDomain={graphXDomain}
            />
          </Col>
        </Row>
        <Row className="operation-table-block">
          <Col span={16}>
            <h2 className="table-header">Operations metrics under {getSelectedService()}</h2>{' '}
            <span className="over-the-last">Over the {getLoopbackInterval(selectedTimeFrame)}</span>
          </Col>
          <Col span={8} className="select-operation-column">
            <Search
              placeholder="Search operation"
              className="select-operation-input"
              value={searchOps}
              disabled={metrics.operationMetricsLoading === true || metrics.serviceOpsMetrics === undefined}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const filteredData = metrics.serviceOpsMetrics!.filter(({ name }: { name: string }) => {
                  return name.toLowerCase().includes(e.target.value.toLowerCase());
                });

                setSearchOps(e.target.value);
                setServiceOpsMetrics(filteredData);

                trackSearchOperationDebounced(e.target.value);
              }}
            />
          </Col>
        </Row>
        <Row>
          <OperationTableDetails
            loading={metrics.operationMetricsLoading}
            error={metrics.opsError}
            data={serviceOpsMetrics === undefined ? metrics.serviceOpsMetrics : serviceOpsMetrics}
            endTime={endTime}
            lookback={selectedTimeFrame}
            serviceName={getSelectedService()}
          />
        </Row>
      </div>
    </>
  );
};

export function mapStateToProps(state: ReduxState): TReduxProps {
  const { services, metrics } = state;
  return {
    services: services.services || [],
    servicesLoading: services.loading,
    metrics,
  };
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchServices, fetchAllServiceMetrics, fetchAggregatedServiceMetrics } = bindActionCreators<
    object,
    any
  >(jaegerApiActions, dispatch);

  return {
    fetchServices,
    fetchAllServiceMetrics,
    fetchAggregatedServiceMetrics,
  };
}

export default withRouteProps(connect(mapStateToProps, mapDispatchToProps)(MonitorATMServicesViewImpl));
