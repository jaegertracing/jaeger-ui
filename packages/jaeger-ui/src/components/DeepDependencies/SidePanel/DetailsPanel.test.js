// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import _set from 'lodash/set';

import stringSupplant from '../../../utils/stringSupplant';
import JaegerAPI from '../../../api/jaeger';
import DetailsPanel from './DetailsPanel';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

import { useSelector } from 'react-redux';

jest.mock('../../common/VerticalResizer', () => {
  return ({ onChange, position }) => (
    <button
      type="button"
      data-testid="vertical-resizer"
      data-position={position}
      onClick={() => onChange(0.6)}
    >
      Mock Resizer
    </button>
  );
});

jest.mock('../../common/DetailsCard', () => {
  return ({ className, details }) => (
    <div data-testid="details-card" className={className}>
      {typeof details === 'string' ? details : JSON.stringify(details)}
    </div>
  );
});

describe('<DetailsPanel />', () => {
  const service = 'test svc';
  const opString = 'test op';

  const baseDecorationState = {
    decorationValue: 'test decorationValue',
    decorationProgressbar: null,
  };

  const setSelectorState = overrides => {
    useSelector.mockReturnValue({
      ...baseDecorationState,
      ...overrides,
    });
  };

  const props = {
    decorationSchema: {
      detailUrl: 'http://test.detail.url?someParam=#{service}',
      detailPath: 'test.detail.path',
      opDetailUrl: 'http://test.opDetail.url?someParam=#{service}&otherParam=#{operation}',
      opDetailPath: 'test.opDetail.path',
      name: 'Decorating #{service}',
    },
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
    jest.clearAllMocks();
    setSelectorState();
  });

  // ---------------- fetchDetails ----------------

  it('fetches correct details url, preferring op-scoped details, or does not fetch at all', () => {
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

  // ---------------- render ----------------

  it('renders', () => {
    const { container } = render(<DetailsPanel {...props} />);
    expect(container).toHaveTextContent(service);
    expect(container).toHaveTextContent(`Decorating ${service}`);
    expect(container).toHaveTextContent(baseDecorationState.decorationValue);
  });

  it('renders with operation', () => {
    const { container } = render(<DetailsPanel {...props} operation={opString} />);
    expect(container).toHaveTextContent(service);
    expect(container).toHaveTextContent(opString);
  });

  it('renders omitted array of operations', () => {
    const { container } = render(<DetailsPanel {...props} operation={['op0', 'op1']} />);
    expect(container).toHaveTextContent(service);
    expect(container).not.toHaveTextContent('op0');
    expect(container).not.toHaveTextContent('op1');
  });

  it('renders with progressbar', () => {
    const progressbarText = 'stand-in progressbar';
    const progressbar = <div data-testid="test-progressbar">{progressbarText}</div>;

    setSelectorState({
      decorationProgressbar: progressbar,
      decorationValue: 'unused',
    });

    render(<DetailsPanel {...props} />);
    expect(screen.getByTestId('test-progressbar')).toBeInTheDocument();
  });

  it('renders while loading', () => {
    render(<DetailsPanel {...props} />);
    expect(document.querySelector('.Ddg--DetailsPanel--LoadingWrapper')).toBeInTheDocument();
  });

  it('renders details', async () => {
    render(<DetailsPanel {...props} />);

    const detailsData = 'details string';
    const response = {};
    _set(response, props.decorationSchema.detailPath, detailsData);

    res(response);

    const detailsCard = await screen.findByTestId('details-card');
    expect(detailsCard.textContent).toBe(detailsData);
  });

  it('renders details error', async () => {
    render(<DetailsPanel {...props} />);
    rej(new Error('fetch error'));

    const detailsCard = await screen.findByTestId('details-card');
    expect(detailsCard).toHaveClass('is-error');
  });

  it('renders detailLink', () => {
    const schemaWithLink = {
      ...props.decorationSchema,
      detailLink: 'test details link',
    };

    render(<DetailsPanel {...props} decorationSchema={schemaWithLink} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', schemaWithLink.detailLink);
  });

  it('renders details path not found error', async () => {
    render(<DetailsPanel {...props} />);
    res({ someOtherData: 'value' });

    const detailsCard = await screen.findByTestId('details-card');
    expect(detailsCard).toHaveClass('is-error');
  });

  // ---------------- onResize ----------------

  it('updates width when resized', () => {
    const { container } = render(<DetailsPanel {...props} />);
    expect(container.querySelector('.Ddg--DetailsPanel')).toHaveStyle('width: 30vw');

    fireEvent.click(screen.getByTestId('vertical-resizer'));
    expect(container.querySelector('.Ddg--DetailsPanel')).toHaveStyle('width: 60vw');
  });
});
