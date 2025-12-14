// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import JaegerAPI from '../../api/jaeger';
import * as getUrl from './url';
import { UnconnectedQualityMetrics, mapDispatchToProps, mapStateToProps } from '.';

const mockNavigate = jest.fn();
const mockLocation = { search: '?service=test-service&lookback=48' };
jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

const headerMock = {
  props: null,
  setService: null,
  setLookback: null,
};

jest.mock('./Header', () => {
  const mockHeader = jest.fn(props => {
    mockHeader.mockProps = props;
    headerMock.props = props;
    headerMock.setService = props.setService;
    headerMock.setLookback = props.setLookback;
    return <div data-testid="header">Header Component</div>;
  });
  return mockHeader;
});

jest.mock('../common/LoadingIndicator', () => {
  return function MockLoadingIndicator() {
    return <div data-testid="loading-indicator">Loading...</div>;
  };
});

jest.mock('./BannerText', () => {
  return function MockBannerText({ bannerText }) {
    return <div data-testid="banner-text">{bannerText}</div>;
  };
});

jest.mock('./ScoreCard', () => {
  return function MockScoreCard({ score }) {
    return (
      <div data-testid="score-card" data-key={score.key}>
        {score.key}
      </div>
    );
  };
});

jest.mock('./MetricCard', () => {
  return function MockMetricCard({ metric }) {
    return (
      <div data-testid="metric-card" data-name={metric.name}>
        {metric.name}
      </div>
    );
  };
});

jest.mock(
  '../common/ExamplesLink',
  () =>
    function MockExamplesLink() {
      return <div>ExamplesLink Component</div>;
    }
);

describe('QualityMetrics', () => {
  describe('UnconnectedQualityMetrics', () => {
    const props = {
      fetchServices: jest.fn(),
      services: ['foo', 'bar', 'baz'],
    };

    const { ...propsWithoutService } = props;
    let fetchQualityMetricsSpy;
    let promise;
    let res;
    let rej;

    beforeAll(() => {
      fetchQualityMetricsSpy = jest.spyOn(JaegerAPI, 'fetchQualityMetrics').mockImplementation(() => {
        promise = new Promise((resolve, reject) => {
          res = resolve;
          rej = reject;
        });
        return promise;
      });
    });

    beforeEach(() => {
      mockNavigate.mockClear();
      props.fetchServices.mockClear();
      fetchQualityMetricsSpy.mockClear();
      headerMock.props = null;
      headerMock.setService = null;
      headerMock.setLookback = null;
    });

    describe('constructor', () => {
      it('fetches services if none are provided', () => {
        const { services: _ses, ...propsWithoutServices } = props;
        render(<UnconnectedQualityMetrics {...propsWithoutServices} />);
        expect(props.fetchServices).toHaveBeenCalledTimes(1);
      });

      it('no-ops if services are provided', () => {
        render(<UnconnectedQualityMetrics {...props} />);
        expect(props.fetchServices).not.toHaveBeenCalled();
      });
    });

    describe('componentDidMount', () => {
      it('fetches quality metrics', () => {
        render(<UnconnectedQualityMetrics {...props} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledWith('test-service', 48);
      });
    });

    describe('componentDidUpdate', () => {
      it('clears state and fetches quality metrics if service changed', () => {
        const { rerender } = render(<UnconnectedQualityMetrics {...props} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);

        const service = 'not-test-service';
        mockLocation.search = `?service=${service}&lookback=48`;
        rerender(<UnconnectedQualityMetrics {...props} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(2);
        expect(fetchQualityMetricsSpy).toHaveBeenLastCalledWith(service, 48);
        mockLocation.search = '?service=test-service&lookback=48';
      });

      it('clears state and fetches quality metrics if lookback changed', () => {
        const { rerender } = render(<UnconnectedQualityMetrics {...props} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);

        const lookback = 48 + 10;
        mockLocation.search = `?service=test-service&lookback=${lookback}`;
        rerender(<UnconnectedQualityMetrics {...props} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(2);
        expect(fetchQualityMetricsSpy).toHaveBeenLastCalledWith('test-service', lookback);
        mockLocation.search = '?service=test-service&lookback=48';
      });

      it('no-ops if neither service or lookback changed', () => {
        const { rerender } = render(<UnconnectedQualityMetrics {...props} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);

        rerender(<UnconnectedQualityMetrics {...props} services={[]} />);
        expect(fetchQualityMetricsSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('fetches quality metrics', () => {
      it('no-ops on falsy service', () => {
        mockLocation.search = '?lookback=48';
        render(<UnconnectedQualityMetrics {...propsWithoutService} />);
        expect(fetchQualityMetricsSpy).not.toHaveBeenCalled();
        mockLocation.search = '?service=test-service&lookback=48';
      });

      it('fetches quality metrics and updates state on success', async () => {
        render(<UnconnectedQualityMetrics {...props} />);

        const qualityMetrics = {
          bannerText: 'test banner text',
          scores: [],
          metrics: [],
        };

        await act(async () => {
          res(qualityMetrics);
        });

        expect(screen.getByTestId('banner-text')).toHaveTextContent('test banner text');
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });

      it('fetches quality metrics and updates state on error', async () => {
        render(<UnconnectedQualityMetrics {...props} />);

        const error = { message: 'Error message' };

        await act(async () => {
          rej(error);
          try {
            await promise;
          } catch (e) {
            // intentionally left blank
          }
        });

        expect(screen.getByText('Error message')).toBeInTheDocument();
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });

    describe('url updates', () => {
      const testLookback = 48 * 4;
      const testUrl = 'test.url';
      let getUrlSpy;
      let latestUrl;

      beforeEach(() => {
        getUrlSpy = jest.spyOn(getUrl, 'getUrl').mockImplementation(() => {
          latestUrl = `${testUrl}.${getUrlSpy.mock.calls.length}`;
          return latestUrl;
        });
      });

      it('sets service', () => {
        render(<UnconnectedQualityMetrics {...props} />);
        const testService = 'new test-service';

        headerMock.setService(testService);

        expect(getUrlSpy).toHaveBeenLastCalledWith({
          lookback: 48,
          service: testService,
        });
        expect(mockNavigate).toHaveBeenLastCalledWith(latestUrl);
      });

      it('sets lookback', () => {
        render(<UnconnectedQualityMetrics {...props} />);

        headerMock.setLookback(testLookback);

        expect(getUrlSpy).toHaveBeenLastCalledWith({
          lookback: testLookback,
          service: 'test-service',
        });
        expect(mockNavigate).toHaveBeenLastCalledWith(latestUrl);
      });

      it('sets lookback without service', () => {
        mockLocation.search = '?lookback=48';
        render(<UnconnectedQualityMetrics {...propsWithoutService} />);

        headerMock.setLookback(testLookback);

        expect(getUrlSpy).toHaveBeenLastCalledWith({
          lookback: testLookback,
          service: '',
        });
        expect(mockNavigate).toHaveBeenLastCalledWith(latestUrl);
        mockLocation.search = '?service=test-service&lookback=48';
      });

      it('ignores falsy lookback', () => {
        render(<UnconnectedQualityMetrics {...props} />);

        headerMock.setLookback(null);

        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('ignores string lookback', () => {
        render(<UnconnectedQualityMetrics {...props} />);

        headerMock.setLookback('test-service');
      });

      it('ignores less than one lookback', () => {
        render(<UnconnectedQualityMetrics {...props} />);

        headerMock.setLookback(-1);

        expect(mockNavigate).not.toHaveBeenCalled();
      });

      it('ignores fractional lookback', () => {
        render(<UnconnectedQualityMetrics {...props} />);

        headerMock.setLookback(2.5);

        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    describe('render', () => {
      it('renders without loading, error, or metrics', () => {
        mockLocation.search = '?lookback=48';
        render(<UnconnectedQualityMetrics {...propsWithoutService} />);
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        expect(screen.queryByTestId('banner-text')).not.toBeInTheDocument();
        mockLocation.search = '?service=test-service&lookback=48';
      });

      it('renders when loading', () => {
        render(<UnconnectedQualityMetrics {...props} />);
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });

      it('renders when errored', async () => {
        render(<UnconnectedQualityMetrics {...props} />);

        const message = 'Error message';

        await act(async () => {
          rej({ message });
          try {
            await promise;
          } catch (e) {
            // intentionally left blank
          }
        });

        expect(screen.getByText(message)).toBeInTheDocument();
      });

      it('renders with metrics', async () => {
        render(<UnconnectedQualityMetrics {...props} />);

        const metrics = {
          bannerText: 'test banner text',
          traceQualityDocumentationLink: 'trace.quality.documentation/link',
          scores: [
            {
              key: 'score0',
            },
            {
              key: 'score1',
            },
          ],
          metrics: [
            {
              name: 'metric 0',
            },
            {
              name: 'metric 1',
            },
          ],
        };

        await act(async () => {
          res(metrics);
        });

        expect(screen.getByTestId('banner-text')).toHaveTextContent('test banner text');
        expect(screen.getAllByTestId('score-card')).toHaveLength(2);
        expect(screen.getByText('score0')).toBeInTheDocument();
        expect(screen.getByText('score1')).toBeInTheDocument();
        expect(screen.getAllByTestId('metric-card')).toHaveLength(2);
        expect(screen.getByText('metric 0')).toBeInTheDocument();
        expect(screen.getByText('metric 1')).toBeInTheDocument();
      });

      it('renders client versions when qualityMetrics.clients is present', async () => {
        render(<UnconnectedQualityMetrics {...props} />);

        const metricsWithClients = {
          bannerText: 'banner',
          traceQualityDocumentationLink: 'doc/link',
          scores: [],
          metrics: [],
          clients: [
            {
              version: '1.2.3',
              minVersion: '1.0.0',
              count: 5,
              examples: ['ex1', 'ex2'],
            },
          ],
        };

        await act(async () => {
          res(metricsWithClients);
        });

        expect(screen.getByText('Client Versions')).toBeInTheDocument();
        expect(screen.getByText('1.2.3')).toBeInTheDocument();
        expect(screen.getByText('1.0.0')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('ExamplesLink Component')).toBeInTheDocument();
      });
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        fetchServices: expect.any(Function),
      });
    });
  });

  describe('mapStateToProps()', () => {
    let getUrlStateSpy;
    const urlState = {
      lookback: 108,
      service: 'test-service',
    };

    beforeAll(() => {
      getUrlStateSpy = jest.spyOn(getUrl, 'getUrlState').mockImplementation(search => search && urlState);
    });

    it('gets services from redux state', () => {
      const services = [urlState.service, 'foo', 'bar'];
      expect(
        mapStateToProps({
          services: { services },
        })
      ).toEqual({ services });
    });
  });
});
