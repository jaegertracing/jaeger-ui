// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { Row, Col, Input, Alert, Select } from 'antd';
import _debounce from 'lodash/debounce';
import _isEmpty from 'lodash/isEmpty';
import store from '../../../utils/storage';
import { Link } from 'react-router-dom';
import OperationTableDetails from './operationDetailsTable';
import ServiceGraph from './serviceGraph';
import LoadingIndicator from '../../common/LoadingIndicator';

import { Points, ServiceMetricsObject, ServiceOpsMetrics, spanKinds } from '../../../types/metrics';
import prefixUrl from '../../../utils/prefix-url';
import { convertTimeUnitToShortTerm, getSuitableTimeUnit } from '../../../utils/date';
import { ONE_HOUR_MS, timeFrameOptions, getLoopbackInterval, yAxisTickFormat } from './timeFrameUtils';

import './index.css';
import getConfig from '../../../utils/config/get-config';
import {
  trackSearchOperation,
  trackSelectService,
  trackSelectSpanKind,
  trackSelectTimeframe,
  trackViewAllTraces,
} from './index.track';
import withRouteProps from '../../../utils/withRouteProps';

import SearchableSelect from '../../common/SearchableSelect';
import { useServices } from '../../../hooks/useTraceDiscovery';
import {
  useServiceMetricsQuery,
  useOperationMetricsQuery,
  MetricsHookParams,
} from '../../../hooks/useMetricsQuery';

const trackSearchOperationDebounced = _debounce(searchQuery => trackSearchOperation(searchQuery), 1000);

const Search = Input.Search;
const Option = Select.Option;

const spanKindOptions = [
  { label: 'Client', value: 'client' },
  { label: 'Server', value: 'server' },
  { label: 'Internal', value: 'internal' },
  { label: 'Producer', value: 'producer' },
  { label: 'Consumer', value: 'consumer' },
];

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

export function MonitorATMServicesViewImpl() {
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const docsLink = getConfig().monitor?.docsLink;
  const graphDivWrapper = useRef<HTMLDivElement>(null);
  const [graphWidth, setGraphWidth] = useState<number>(300);
  const [serviceOpsMetrics, setServiceOpsMetrics] = useState<ServiceOpsMetrics[] | undefined>(undefined);
  const [searchOps, setSearchOps] = useState<string>('');
  const [graphXDomain, setGraphXDomain] = useState<number[]>([]);
  const [selectedService, setSelectedService] = useState<string | undefined>(
    store.getString('lastAtmSearchService')
  );
  const [selectedSpanKind, setSelectedSpanKind] = useState<spanKinds>(() => {
    const stored = store.getString('lastAtmSearchSpanKind');
    return spanKindOptions.some(opt => opt.value === stored) ? (stored as spanKinds) : 'server';
  });
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<number>(
    store.getNumber('lastAtmSearchTimeframe', ONE_HOUR_MS)
  );

  const currentService = selectedService || services[0];

  // endTs is intentionally absent — it is resolved to Date.now() inside each
  // hook's queryFn so that the query key stays stable and React Query's staleTime
  // governs freshness, rather than an imperative "trigger a fetch" effect.
  const metricQueryParams: MetricsHookParams | undefined = useMemo(() => {
    if (!currentService) return undefined;
    return {
      quantile: 0.95,
      lookback: selectedTimeFrame,
      step: 60 * 1000,
      ratePer: 10 * 60 * 1000,
      spanKind: selectedSpanKind,
    };
  }, [currentService, selectedTimeFrame, selectedSpanKind]);

  const { data: serviceMetricsData, isFetching: serviceMetricsLoading } = useServiceMetricsQuery(
    currentService,
    metricQueryParams
  );

  const {
    data: operationMetricsData,
    isFetching: operationMetricsLoading,
    dataUpdatedAt: opsDataUpdatedAt,
  } = useOperationMetricsQuery(currentService, metricQueryParams);

  const serviceMetrics = serviceMetricsData?.serviceMetrics ?? null;
  const serviceError = serviceMetricsData?.serviceError ?? {
    service_latencies_50: null,
    service_latencies_75: null,
    service_latencies_95: null,
    service_call_rate: null,
    service_error_rate: null,
  };
  const fetchedServiceOpsMetrics = operationMetricsData?.serviceOpsMetrics;
  const opsError = operationMetricsData?.opsError ?? {
    opsLatencies: null,
    opsCalls: null,
    opsErrors: null,
  };

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
    return selectedService || store.getString('lastAtmSearchService') || services[0];
  }, [services, selectedService]);

  const handleServiceChange = useCallback((value: string) => {
    setSelectedService(value);
    store.set('lastAtmSearchService', value);
    trackSelectService(value);
  }, []);

  const handleSpanKindChange = useCallback((value: string) => {
    setSelectedSpanKind(value as spanKinds);
    store.set('lastAtmSearchSpanKind', value);
    const { label } = spanKindOptions.find(option => option.value === value)!;
    trackSelectSpanKind(label);
  }, []);

  const handleTimeFrameChange = useCallback((value: number) => {
    setSelectedTimeFrame(value);
    store.set('lastAtmSearchTimeframe', value);
    const { label } = timeFrameOptions.find(option => option.value === value)!;
    trackSelectTimeframe(label);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    calcGraphXDomain();

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions, calcGraphXDomain]);

  // Measure the graph container width after every servicesLoading → false
  // transition. useLayoutEffect ensures the measurement happens before paint,
  // avoiding a visible half-width flash. The mount effect above no longer calls
  // updateDimensions() directly because the ref is null while the loading
  // spinner is shown; this effect handles both the initial render (when
  // servicesLoading is already false) and the transition from true → false.
  useLayoutEffect(() => {
    if (!servicesLoading) {
      updateDimensions();
    }
  }, [servicesLoading, updateDimensions]);

  useEffect(() => {
    calcGraphXDomain();
  }, [selectedTimeFrame, calcGraphXDomain]);

  // Reset filtered ops when fresh data arrives from the hook.
  useEffect(() => {
    setServiceOpsMetrics(undefined);
    setSearchOps('');
  }, [fetchedServiceOpsMetrics]);

  // Persist the active service to localStorage once the services list resolves
  // and currentService is known (covers the "no prior selection" first-visit case).
  useEffect(() => {
    if (currentService) {
      store.set('lastAtmSearchService', currentService);
    }
  }, [currentService]);

  const serviceLatencies = serviceMetrics ? serviceMetrics.service_latencies : null;
  const displayTimeUnit = calcDisplayTimeUnit(serviceLatencies);
  const serviceErrorRate = serviceMetrics ? serviceMetrics.service_error_rate : null;

  if (servicesLoading) {
    return <LoadingIndicator vcentered centered />;
  }

  return (
    <>
      {_isEmpty(serviceMetrics && serviceMetrics.service_latencies) && (
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
              disabled={operationMetricsLoading}
              loading={operationMetricsLoading}
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
              disabled={operationMetricsLoading}
              loading={operationMetricsLoading}
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
              disabled={operationMetricsLoading}
              loading={operationMetricsLoading}
            >
              {timeFrameOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {`Last ${option.label}`}
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
                serviceError.service_latencies_50 &&
                serviceError.service_latencies_75 &&
                serviceError.service_latencies_95
              }
              loading={serviceMetricsLoading}
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
              error={serviceError.service_error_rate}
              loading={serviceMetricsLoading}
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
              loading={serviceMetricsLoading}
              error={serviceError.service_call_rate}
              name="Request rate (req/s)"
              width={graphWidth}
              metricsData={serviceMetrics ? serviceMetrics.service_call_rate : null}
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
            <span className="over-the-last">Last {getLoopbackInterval(selectedTimeFrame)}</span>
          </Col>
          <Col span={8} className="select-operation-column">
            <Search
              placeholder="Search operation"
              className="select-operation-input"
              value={searchOps}
              disabled={operationMetricsLoading === true || fetchedServiceOpsMetrics === undefined}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const filteredData = fetchedServiceOpsMetrics!.filter(({ name }: { name: string }) => {
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
            loading={operationMetricsLoading}
            error={opsError}
            data={serviceOpsMetrics === undefined ? fetchedServiceOpsMetrics : serviceOpsMetrics}
            endTime={opsDataUpdatedAt || Date.now()}
            lookback={selectedTimeFrame}
            serviceName={getSelectedService()}
          />
        </Row>
      </div>
    </>
  );
}

export default withRouteProps(MonitorATMServicesViewImpl);
