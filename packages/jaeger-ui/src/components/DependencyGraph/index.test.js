// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as constants from '../../utils/constants';

import { DependencyGraphPageImpl as DependencyGraph, mapDispatchToProps, mapStateToProps } from './index';

/* ---------------- live prop capture ---------------- */

let latestDagProps = null;
let latestOptionsProps = null;

jest.mock('./DAG', () => props => {
  latestDagProps = props;
  return <div data-testid="dag-component" />;
});

jest.mock('./DAGOptions', () => props => {
  latestOptionsProps = props;
  return <div data-testid="dag-options" />;
});

jest.mock('../common/LoadingIndicator', () => props => <div data-testid="loading-indicator" {...props} />);

jest.mock('../common/ErrorMessage', () => props => <div data-testid="error-message" {...props} />);

const getDAGProps = () => latestDagProps;
const getOptionsProps = () => latestOptionsProps;

/* ---------------- fixtures ---------------- */

const childId = 'boomya';
const parentId = 'elder-one';
const callCount = 1;

const dependencies = [{ callCount, child: childId, parent: parentId }];

const state = {
  dependencies: {
    dependencies,
    error: null,
    loading: false,
  },
  router: { location: { search: '' } },
};

const props = mapStateToProps(state);

/* ---------------- tests ---------------- */

describe('<DependencyGraph /> functional', () => {
  beforeEach(() => {
    jest.spyOn(constants, 'getAppEnvironment').mockReturnValue('development');
    latestDagProps = null;
    latestOptionsProps = null;
  });

  it('does not explode', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    expect(screen.getByTestId('dag-component')).toBeInTheDocument();
    expect(screen.getByTestId('dag-options')).toBeInTheDocument();
  });

  it('shows loading indicator', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} loading />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} error={{}} />);
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('shows empty state message', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} nodes={null} links={null} />);
    expect(screen.getByText(/no service dependencies found/i)).toBeInTheDocument();
  });

  it('initializes with default values', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    const options = getOptionsProps();

    expect(options.selectedService).toBeUndefined();
    expect(options.selectedLayout).toBe('dot');
    expect(options.selectedDepth).toBe(5);
  });

  it('handles service selection', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    const options = getOptionsProps();

    act(() => {
      options.onServiceSelect('test-service');
    });

    expect(getDAGProps().selectedService).toBe('test-service');
  });

  it('handles layout selection', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    const options = getOptionsProps();

    act(() => {
      options.onLayoutSelect('sfdp');
    });

    expect(getDAGProps().selectedLayout).toBe('sfdp');
  });

  it('handles reset', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    const options = getOptionsProps();

    act(() => {
      options.onServiceSelect('A');
      options.onDepthChange(3);
    });

    act(() => {
      options.onReset();
    });

    const dag = getDAGProps();
    expect(dag.selectedService).toBe('');
    expect(dag.selectedDepth).toBe(5);
  });

  it('debounces depth changes', () => {
    jest.useFakeTimers();

    render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    const options = getOptionsProps();

    act(() => {
      options.onDepthChange(3);
    });

    expect(getDAGProps().selectedDepth).toBe(5);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(getDAGProps().selectedDepth).toBe(3);

    jest.useRealTimers();
  });

  it('passes correct matchCount to DAGOptions', () => {
    const sampleDeps = [
      { parent: 'serviceA', child: 'serviceB', callCount: 1 },
      { parent: 'serviceB', child: 'anotherService', callCount: 1 },
      { parent: 'serviceA', child: 'anotherService', callCount: 1 },
    ];

    const { rerender } = render(
      <DependencyGraph {...props} dependencies={sampleDeps} uiFind="service" fetchDependencies={() => {}} />
    );

    expect(getOptionsProps().matchCount).toBe(3);

    rerender(
      <DependencyGraph {...props} dependencies={sampleDeps} uiFind="another" fetchDependencies={() => {}} />
    );

    expect(getOptionsProps().matchCount).toBe(1);
  });

  it('filters graph when a service is selected', () => {
    const testDeps = [
      { parent: 'A', child: 'B', callCount: 1 },
      { parent: 'C', child: 'D', callCount: 1 },
    ];

    render(<DependencyGraph {...props} dependencies={testDeps} fetchDependencies={() => {}} />);

    const options = getOptionsProps();

    act(() => {
      options.onServiceSelect('A');
      options.onDepthChange(1);
    });

    const dag = getDAGProps();
    expect(dag.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
    expect(dag.data.nodes.length).toBe(2);
  });
});

/* ---------------- redux tests ---------------- */

describe('mapStateToProps()', () => {
  it('refines state to generate props', () => {
    expect(mapStateToProps(state)).toEqual({
      ...state.dependencies,
      nodes: expect.any(Array),
      links: expect.any(Array),
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('provides fetchDependencies', () => {
    expect(mapDispatchToProps({})).toEqual({
      fetchDependencies: expect.any(Function),
    });
  });
});
