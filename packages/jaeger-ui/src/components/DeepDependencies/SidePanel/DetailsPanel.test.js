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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import _set from 'lodash/set';

import stringSupplant from '../../../utils/stringSupplant';
import JaegerAPI from '../../../api/jaeger';
import { UnconnectedDetailsPanel as DetailsPanel } from './DetailsPanel';

jest.mock('../../common/VerticalResizer', () => {
  return ({ onChange, position }) => (
    <div data-testid="vertical-resizer" data-position={position} onClick={() => onChange(0.6)}>
      Mock Resizer
    </div>
  );
});

jest.mock('../../common/DetailsCard', () => {
  return ({ className, details }) => (
    <div data-testid="details-card" className={className}>
      {typeof details === 'string' ? details : JSON.stringify(details)}
    </div>
  );
});

describe('<SidePanel>', () => {
  const service = 'test svc';
  const opString = 'test op';
  const props = {
    decorationSchema: {
      detailUrl: 'http://test.detail.url?someParam=#{service}',
      detailPath: 'test.detail.path',
      opDetailUrl: 'http://test.opDetail.url?someParam=#{service}&otherParam=#{operation}',
      opDetailPath: 'test.opDetail.path',
      name: 'Decorating #{service}',
    },
    decorationValue: 'test decorationValue',
    service,
  };
  const supplantedUrl = stringSupplant(props.decorationSchema.detailUrl, { service });
  const supplantedOpUrl = stringSupplant(props.decorationSchema.opDetailUrl, {
    operation: opString,
    service,
  });
  let fetchDecorationSpy;
  let promise;
  let res;
  let rej;

  beforeAll(() => {
    fetchDecorationSpy = jest.spyOn(JaegerAPI, 'fetchDecoration').mockImplementation(() => {
      promise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
      });
      return promise;
    });
  });

  beforeEach(() => {
    fetchDecorationSpy.mockClear();
    jest.clearAllMocks();
  });

  describe('fetchDetails', () => {
    it('fetches correct details url, perferring op-scoped details, or does not fetch at all', () => {
      const component1 = render(<DetailsPanel {...props} operation={opString} />);
      expect(fetchDecorationSpy).toHaveBeenCalledWith(supplantedOpUrl);
      component1.unmount();
      fetchDecorationSpy.mockClear();

      const component2 = render(<DetailsPanel {...props} />);
      expect(fetchDecorationSpy).toHaveBeenCalledWith(supplantedUrl);
      component2.unmount();
      fetchDecorationSpy.mockClear();

      const component3 = render(
        <DetailsPanel
          service={service}
          decorationSchema={{
            name: 'Test without URLs',
          }}
        />
      );
      expect(fetchDecorationSpy).not.toHaveBeenCalled();
      component3.unmount();
    });
  });

  describe('render', () => {
    it('renders', () => {
      const { container } = render(<DetailsPanel {...props} />);

      expect(container.textContent).toContain(service);

      expect(container.textContent).toContain(`Decorating ${service}`);

      expect(container.textContent).toContain(props.decorationValue);
    });

    it('renders with operation', () => {
      const { container } = render(<DetailsPanel {...props} operation={opString} />);

      expect(container.textContent).toContain(service);
      expect(container.textContent).toContain(opString);
    });

    it('renders omitted array of operations', () => {
      const { container } = render(<DetailsPanel {...props} operation={['op0', 'op1']} />);

      expect(container.textContent).toContain(service);

      expect(container.textContent).not.toContain('op0');
      expect(container.textContent).not.toContain('op1');
    });

    it('renders with progressbar', () => {
      const progressbarText = 'stand-in progressbar';
      const progressbar = <div data-testid="test-progressbar">{progressbarText}</div>;
      const { container } = render(<DetailsPanel {...props} decorationProgressbar={progressbar} />);

      expect(screen.getByTestId('test-progressbar')).toBeInTheDocument();
      expect(screen.getByText(progressbarText)).toBeInTheDocument();

      expect(container.textContent).not.toContain(props.decorationValue);
    });

    it('renders while loading', () => {
      const { container } = render(<DetailsPanel {...props} />);
      expect(container.querySelector('.Ddg--DetailsPanel--LoadingWrapper')).toBeInTheDocument();
    });

    it('renders details', async () => {
      render(<DetailsPanel {...props} />);

      const detailsData = 'details string';
      const response = {};
      _set(response, props.decorationSchema.detailPath, detailsData);

      res(response);

      const detailsCard = await screen.findByTestId('details-card');
      expect(detailsCard).toBeInTheDocument();
      expect(detailsCard.textContent).toBe(detailsData);
    });

    it('renders details error', async () => {
      render(<DetailsPanel {...props} />);

      rej(new Error('fetch error'));

      const detailsCard = await screen.findByTestId('details-card');
      expect(detailsCard).toBeInTheDocument();
      expect(detailsCard).toHaveClass('is-error');
      expect(detailsCard.textContent).toContain('Unable to fetch decoration: fetch error');
    });

    it('renders detailLink', () => {
      const schemaWithLink = {
        ...props.decorationSchema,
        detailLink: 'test details link',
      };
      render(<DetailsPanel {...props} decorationSchema={schemaWithLink} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', schemaWithLink.detailLink);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer noopener');
    });

    it('renders details path not found error', async () => {
      render(<DetailsPanel {...props} />);

      const response = { someOtherData: 'value' };

      res(response);

      const detailsCard = await screen.findByTestId('details-card');
      expect(detailsCard).toBeInTheDocument();
      expect(detailsCard).toHaveClass('is-error');
      expect(detailsCard.textContent).toContain(
        `\`${props.decorationSchema.detailPath}\` not found in response`
      );
    });
  });

  describe('componentDidMount', () => {
    it('fetches details', () => {
      expect(fetchDecorationSpy).not.toHaveBeenCalled();

      render(<DetailsPanel {...props} />);
      expect(fetchDecorationSpy).toHaveBeenCalled();
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(supplantedUrl);
    });
  });

  describe('componentDidUpdate', () => {
    it('fetches details and clears relevant state if decorationSchema changes', async () => {
      const { rerender } = render(<DetailsPanel {...props} />);
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);

      fetchDecorationSpy.mockClear();

      const detailUrl = 'http://new.schema.detailsUrl?service=#{service}';
      const newSchema = {
        ...props.decorationSchema,
        detailUrl,
      };

      rerender(<DetailsPanel {...props} decorationSchema={newSchema} />);

      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(detailUrl, { service }));
    });

    it('fetches details and clears relevant state if operation changes', () => {
      const { rerender } = render(<DetailsPanel {...props} />);
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);

      fetchDecorationSpy.mockClear();

      rerender(<DetailsPanel {...props} operation={opString} />);

      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(supplantedOpUrl);
    });

    it('fetches details and clears relevant state if service changes', () => {
      const { rerender } = render(<DetailsPanel {...props} />);
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);

      fetchDecorationSpy.mockClear();

      const newService = 'different test service';
      rerender(<DetailsPanel {...props} service={newService} />);

      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(
        stringSupplant(props.decorationSchema.detailUrl, { service: newService })
      );
    });

    it('does nothing if decorationSchema, operation, and service are unchanged', () => {
      const { rerender } = render(<DetailsPanel {...props} />);
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);

      fetchDecorationSpy.mockClear();

      rerender(<DetailsPanel {...props} decorationValue={`not_${props.decorationValue}`} />);

      expect(fetchDecorationSpy).not.toHaveBeenCalled();
    });
  });

  describe('onResize', () => {
    it('updates state', () => {
      const { container } = render(<DetailsPanel {...props} />);

      const initialWidth = '30vw';
      expect(container.querySelector('.Ddg--DetailsPanel')).toHaveStyle(`width: ${initialWidth}`);

      const resizer = screen.getByTestId('vertical-resizer');
      fireEvent.click(resizer);

      expect(container.querySelector('.Ddg--DetailsPanel')).toHaveStyle('width: 60vw');
    });
  });
});
