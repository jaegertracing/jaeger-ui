// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useServices } from '../../hooks/useTraceDiscovery';

import JaegerAPI from '../../api/jaeger';
import LoadingIndicator from '../common/LoadingIndicator';
import DetailsCard from '../common/DetailsCard';
import ExamplesLink from '../common/ExamplesLink';
import BannerText from './BannerText';
import Header from './Header';
import MetricCard from './MetricCard';
import ScoreCard from './ScoreCard';
import { getUrl, getUrlState } from './url';

import { TQualityMetrics } from './types';

import './index.css';

export function QualityMetricsImpl() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lookback, service } = React.useMemo(() => getUrlState(location.search), [location.search]);
  const [qualityMetrics, setQualityMetrics] = React.useState<TQualityMetrics | undefined>();
  const [error, setError] = React.useState<Error | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);

  const { data: services = [] } = useServices();

  React.useEffect(() => {
    if (!service) return;

    setLoading(true);

    JaegerAPI.fetchQualityMetrics(service, lookback)
      .then((metrics: TQualityMetrics) => {
        setQualityMetrics(metrics);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setLoading(false);
      });
  }, [service, lookback]);

  const setLookback = React.useCallback(
    (newLookback: number | null) => {
      if (!newLookback) return;
      if (newLookback < 1 || newLookback !== Math.floor(newLookback)) return;

      navigate(getUrl({ lookback: newLookback, service: service || '' }));
    },
    [navigate, service]
  );

  const setService = React.useCallback(
    (newService: string) => {
      navigate(getUrl({ lookback, service: newService }));
    },
    [navigate, lookback]
  );

  return (
    <div className="QualityMetrics">
      <Header
        lookback={lookback}
        service={service}
        services={services}
        setService={setService}
        setLookback={setLookback}
      />
      {qualityMetrics && (
        <>
          <BannerText bannerText={qualityMetrics.bannerText} />
          <div className="QualityMetrics--Body">
            <div className="QualityMetrics--ScoreCards">
              {qualityMetrics.scores.map(score => (
                <ScoreCard
                  key={score.key}
                  score={score}
                  link={qualityMetrics.traceQualityDocumentationLink}
                />
              ))}
            </div>
            <div className="QualityMetrics--MetricCards">
              {qualityMetrics.metrics.map(metric => (
                <MetricCard key={metric.name} metric={metric} />
              ))}
            </div>
            {qualityMetrics.clients && (
              <DetailsCard
                className="QualityMetrics--ClientVersions"
                columnDefs={[
                  {
                    key: 'version',
                    label: 'Version',
                  },
                  {
                    key: 'minVersion',
                    label: 'Minimum Version',
                  },
                  {
                    key: 'count',
                    label: 'Count',
                  },
                  {
                    key: 'examples',
                    label: 'Examples',
                    preventSort: true,
                  },
                ]}
                details={
                  qualityMetrics.clients &&
                  qualityMetrics.clients.map(clientRow => ({
                    ...clientRow,
                    examples: {
                      value: (
                        <ExamplesLink examples={clientRow.examples} key={`${clientRow.version}--examples`} />
                      ),
                    },
                  }))
                }
                header="Client Versions"
              />
            )}
          </div>
        </>
      )}
      {loading && <LoadingIndicator centered />}
      {error && <div className="QualityMetrics--Error">{error.message}</div>}
    </div>
  );
}

export default QualityMetricsImpl;
