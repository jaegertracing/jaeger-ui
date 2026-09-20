// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { Row, Col, Input, Alert, Select, Button } from 'antd';
import _debounce from 'lodash/debounce';
import _isEmpty from 'lodash/isEmpty';
import store from '../../../utils/storage';
import { Link } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
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
import { type MetricsQueryParams, useServiceMetricsQuery, useOperationMetricsQuery } from './useMetricsQuery';
import { getUrl, getUrlState } from '../url';

type TOwnProps = {
  search?: string;
  navigate?: NavigateFunction;
};

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

const getDefaultSpanKind = (): spanKinds => {
  const stored = store.getString('lastAtmSearchSpanKind');
  return spanKindOptions.some(opt => opt.value === stored) ? (stored as spanKinds) : 'server';
};

const resolveService = (candidate: string | undefined, services: string[]): string | undefined => {
  if (candidate && services.includes(candidate)) return candidate;
  const stored = store.getString('lastAtmSearchService');
  if (stored && services.includes(stored)) return stored;
  return services[0];
};

const getFiltersFromSearch = (search: string) => {
  const urlState = getUrlState(search);
  return {
    selectedService: urlState.service ?? store.getString('lastAtmSearchService'),
    selectedSpanKind: urlState.spanKind ?? getDefaultSpanKind(),
    selectedTimeFrame: urlState.timeframe ?? store.getNumber('lastAtmSearchTimeframe', ONE_HOUR_MS),
    urlOwned: {
      service: urlState.service != null,
      spanKind: urlState.spanKind != null,
      timeframe: urlState.timeframe != null,
    },
  };
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

export function MonitorATMServicesViewImpl({ search = '', navigate }: TOwnProps) {
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const docsLink = getConfig().monitor?.docsLink;
  const graphDivWrapper = useRef<HTMLDivElement>(null);
  const initialFilters = getFiltersFromSearch(search);
  const [endTime, setEndTime] = useState<number>(Date.now());
  const [graphWidth, setGraphWidth] = useState<number>(300);
  const [serviceOpsMetrics, setServiceOpsMetrics] = useState<ServiceOpsMetrics[] | undefined>(undefined);
  const [searchOps, setSearchOps] = useState<string>('');
  const [graphXDomain, setGraphXDomain] = useState<number[]>([]);
  const [selectedService, setSelectedService] = useState<string | undefined>(initialFilters.selectedService);
  const [selectedSpanKind, setSelectedSpanKind] = useState<spanKinds>(initialFilters.selectedSpanKind);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<number>(initialFilters.selectedTimeFrame);

  const urlOwned = useRef(initialFilters.urlOwned);
  const isInternalUrlSync = useRef(false);
  const previousSearch = useRef(search);

  useEffect(() => {
    const filters = getFiltersFromSearch(search);
    const isExternalSearchChange = !isInternalUrlSync.current && previousSearch.current !== search;
    if (!isInternalUrlSync.current) {
      urlOwned.current = filters.urlOwned;
    }
    if (isExternalSearchChange) {
      setEndTime(previous => Math.max(Date.now(), previous + 1));
    }
    isInternalUrlSync.current = false;
    previousSearch.current = search;
    setSelectedService(filters.selectedService);
    setSelectedSpanKind(filters.selectedSpanKind);
    setSelectedTimeFrame(filters.selectedTimeFrame);
  }, [search]);

  const currentService = resolveService(selectedService, services);

  const metricQueryParams: MetricsQueryParams | undefined = useMemo(() => {
    if (!currentService) return undefined;
    return {
      endTs: endTime,
      lookback: selectedTimeFrame,
      step: 60 * 1000,
      ratePer: 10 * 60 * 1000,
      spanKind: selectedSpanKind,
    };
  }, [currentService, endTime, selectedTimeFrame, selectedSpanKind]);

  const {
    data: serviceMetricsData,
    isFetching: serviceMetricsFetching,
    isLoading: serviceMetricsInitialLoading,
  } = useServiceMetricsQuery(currentService, metricQueryParams);

  const {
    data: operationMetricsData,
    isFetching: operationMetricsFetching,
    isLoading: operationMetricsInitialLoading,
  } = useOperationMetricsQuery(currentService, metricQueryParams);

  const [refreshRequested, setRefreshRequested] = useState(false);

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

  const updateDimensions = useCallback(() => {
    if (graphDivWrapper.current) {
      setGraphWidth(graphDivWrapper.current.offsetWidth - 24);
    }
  }, []);

  const getSelectedService = useCallback(() => {
    return resolveService(selectedService, services);
  }, [services, selectedService]);

  const advanceEndTime = useCallback(() => {
    setEndTime(previous => Math.max(Date.now(), previous + 1));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshRequested(true);
    advanceEndTime();
  }, [advanceEndTime]);

  const syncFiltersToUrl = useCallback(
    (filters: { service: string; spanKind: spanKinds; timeframe: number }) => {
      if (!navigate) return;
      isInternalUrlSync.current = true;
      navigate(getUrl(filters, search), { replace: true });
    },
    [navigate, search]
  );

  const handleServiceChange = useCallback(
    (value: string) => {
      urlOwned.current.service = false;
      setSelectedService(value);
      advanceEndTime();
      trackSelectService(value);
      syncFiltersToUrl({ service: value, spanKind: selectedSpanKind, timeframe: selectedTimeFrame });
    },
    [advanceEndTime, selectedSpanKind, selectedTimeFrame, syncFiltersToUrl]
  );

  const handleSpanKindChange = useCallback(
    (value: string) => {
      const spanKind = value as spanKinds;
      urlOwned.current.spanKind = false;
      setSelectedSpanKind(spanKind);
      advanceEndTime();
      const { label } = spanKindOptions.find(option => option.value === value)!;
      trackSelectSpanKind(label);
      const service = resolveService(selectedService, services);
      if (service) {
        syncFiltersToUrl({ service, spanKind, timeframe: selectedTimeFrame });
      }
    },
    [advanceEndTime, selectedService, selectedTimeFrame, services, syncFiltersToUrl]
  );

  const handleTimeFrameChange = useCallback(
    (value: number) => {
      urlOwned.current.timeframe = false;
      setSelectedTimeFrame(value);
      advanceEndTime();
      const { label } = timeFrameOptions.find(option => option.value === value)!;
      trackSelectTimeframe(label);
      const service = resolveService(selectedService, services);
      if (service) {
        syncFiltersToUrl({ service, spanKind: selectedSpanKind, timeframe: value });
      }
    },
    [advanceEndTime, selectedService, selectedSpanKind, services, syncFiltersToUrl]
  );

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

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
    setGraphXDomain([endTime - selectedTimeFrame, endTime]);
  }, [endTime, selectedTimeFrame]);

  // Reset filtered ops when fresh data arrives from the hook.
  useEffect(() => {
    setServiceOpsMetrics(undefined);
    setSearchOps('');
  }, [fetchedServiceOpsMetrics]);

  // Clear the Refresh-button spinner once the manual refresh fetch completes.
  useEffect(() => {
    if (!serviceMetricsFetching && !operationMetricsFetching) {
      setRefreshRequested(false);
    }
  }, [serviceMetricsFetching, operationMetricsFetching]);

  useEffect(() => {
    if (currentService && !urlOwned.current.service) {
      store.set('lastAtmSearchService', currentService);
    }
    if (!urlOwned.current.spanKind) {
      store.set('lastAtmSearchSpanKind', selectedSpanKind);
    }
    if (!urlOwned.current.timeframe) {
      store.set('lastAtmSearchTimeframe', selectedTimeFrame);
    }
  }, [currentService, selectedSpanKind, selectedTimeFrame]);

  const serviceLatencies = serviceMetrics ? serviceMetrics.service_latencies : null;
  const displayTimeUnit = calcDisplayTimeUnit(serviceLatencies);
  const serviceErrorRate = serviceMetrics ? serviceMetrics.service_error_rate : null;
  const controlsInitialLoading = serviceMetricsInitialLoading || operationMetricsInitialLoading;
  const refreshLoading = refreshRequested && (serviceMetricsFetching || operationMetricsFetching);
  const showNoMetricsAlert =
    !serviceMetricsFetching && !serviceMetricsInitialLoading && _isEmpty(serviceMetrics?.service_latencies);

  if (servicesLoading) {
    return <LoadingIndicator vcentered centered />;
  }

  return (
    <>
      {showNoMetricsAlert && (
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
        <Row className="service-span-kind-row" gutter={16} align="bottom">
          <Col className="service-filter-col">
            <h2 className="service-selector-header">Service</h2>
            <SearchableSelect
              value={getSelectedService()}
              onChange={handleServiceChange}
              placeholder="Select A Service"
              className="select-a-service-input"
              disabled={controlsInitialLoading}
              loading={controlsInitialLoading}
            >
              {services.map((service: string) => (
                <Option key={service} value={service}>
                  {service}
                </Option>
              ))}
            </SearchableSelect>
          </Col>
          <Col className="span-kind-filter-col">
            <h2 className="span-kind-selector-header">Span Kind</h2>
            <SearchableSelect
              value={selectedSpanKind}
              onChange={handleSpanKindChange}
              placeholder="Select A Span Kind"
              className="span-kind-selector"
              disabled={controlsInitialLoading}
              loading={controlsInitialLoading}
            >
              {spanKindOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </SearchableSelect>
          </Col>
          <Col span={4} className="refresh-col">
            <Button
              className="refresh-btn"
              onClick={handleRefresh}
              loading={refreshLoading}
              disabled={!currentService || refreshLoading}
            >
              Refresh
            </Button>
          </Col>
        </Row>
        <Row align="middle">
          <Col span={16}>
            <p className="operations-metrics-text">
              Aggregation of all &quot;{getSelectedService()}&quot; metrics in selected timeframe.{' '}
              <a
                href={prefixUrl(
                  `/search?end=${endTime}000&limit=20&lookback=${
                    selectedTimeFrame / (3600 * 1000)
                  }h&maxDuration&minDuration&service=${getSelectedService()}&start=${
                    endTime - selectedTimeFrame
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
              disabled={controlsInitialLoading}
              loading={controlsInitialLoading}
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
              loading={serviceMetricsFetching}
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
              loading={serviceMetricsFetching}
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
              loading={serviceMetricsFetching}
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
        <Row className="operation-table-block" align="middle">
          <Col span={16}>
            <h2 className="table-header">Operations metrics under {getSelectedService()}</h2>{' '}
            <span className="over-the-last">Last {getLoopbackInterval(selectedTimeFrame)}</span>
          </Col>
          <Col span={8} className="select-operation-column">
            <Search
              placeholder="Search operation"
              className="select-operation-input"
              value={searchOps}
              disabled={operationMetricsFetching === true || fetchedServiceOpsMetrics === undefined}
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
            loading={operationMetricsFetching}
            error={opsError}
            data={serviceOpsMetrics === undefined ? fetchedServiceOpsMetrics : serviceOpsMetrics}
            endTime={endTime}
            lookback={selectedTimeFrame}
            serviceName={getSelectedService() ?? ''}
          />
        </Row>
      </div>
    </>
  );
}

export default withRouteProps(MonitorATMServicesViewImpl);
