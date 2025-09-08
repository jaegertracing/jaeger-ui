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

import * as jaegerApiActions from '../../actions/jaeger-api';
import JaegerAPI from '../../api/jaeger';
import LoadingIndicator from '../common/LoadingIndicator';
import DetailsCard from '../common/DetailsCard';
import ExamplesLink from '../common/ExamplesLink';
import BannerText from './BannerText';
import Header from './Header';
import MetricCard from './MetricCard';
import ScoreCard from './ScoreCard';
import { getUrl, getUrlState } from './url';

import { ReduxState } from '../../types';
import { TQualityMetrics } from './types';

import './index.css';
import withRouteProps from '../../utils/withRouteProps';

type TOwnProps = {
  history: RouterHistory;
  location: Location;
};

type TDispatchProps = {
  fetchServices: () => void;
};

type TReduxProps = {
  lookback: number;
  service?: string;
  services?: string[] | null;
};

export type TProps = TDispatchProps & TReduxProps & TOwnProps;

type TState = {
  qualityMetrics?: TQualityMetrics;
  error?: Error;
  loading?: boolean;
};

export class UnconnectedQualityMetrics extends React.PureComponent<TProps, TState> {
  state: TState = {};

  constructor(props: TProps) {
    super(props);

    const { fetchServices, services } = props;
    if (!services) {
      fetchServices();
    }
  }

  componentDidMount() {
    this.fetchQualityMetrics();
  }

  componentDidUpdate(prevProps: TProps) {
    if (prevProps.service !== this.props.service || prevProps.lookback !== this.props.lookback) {
      this.setState({
        qualityMetrics: undefined,
        error: undefined,
        loading: false,
      });
      this.fetchQualityMetrics();
    }
  }

  fetchQualityMetrics() {
    const { lookback, service } = this.props;
    if (!service) return;

    this.setState({ loading: true });

    JaegerAPI.fetchQualityMetrics(service, lookback)
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

  setLookback = (lookback: number | null) => {
    if (!lookback) return;
    if (lookback < 1 || lookback !== Math.floor(lookback)) return;

    const { history, service = '' } = this.props;
    history.push(getUrl({ lookback, service }));
  };

  setService = (service: string) => {
    const { history, lookback } = this.props;
    history.push(getUrl({ lookback, service }));
  };

  render() {
    const { lookback, service, services } = this.props;
    const { qualityMetrics, error, loading } = this.state;
    return (
      <div className="QualityMetrics">
        <Header
          lookback={lookback}
          service={service}
          services={services}
          setService={this.setService}
          setLookback={this.setLookback}
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
                          <ExamplesLink
                            examples={clientRow.examples}
                            key={`${clientRow.version}--examples`}
                          />
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
}

export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const {
    services: { services },
  } = state;
  return {
    ...getUrlState(ownProps.location.search),
    services,
  };
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchServices } = bindActionCreators(jaegerApiActions, dispatch);

  return {
    fetchServices,
  };
}

export default withRouteProps(connect(mapStateToProps, mapDispatchToProps)(UnconnectedQualityMetrics));
