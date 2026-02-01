import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { TracePageImpl } from '../index';
import { fetchedState } from '../../../constants';
import { ETraceViewType } from '../types';

describe('TracePage URL Normalization', () => {
  const defaultProps = {
    acknowledgeArchive: jest.fn(),
    archiveTrace: jest.fn(),
    fetchTrace: jest.fn(),
    focusUiFindMatches: jest.fn(),
    history: createMemoryHistory(),
    location: {
      search: '',
      state: {},
      pathname: '/trace/uppercasetraceid',
      hash: '',
      key: 'newkey',
    },
    params: { id: 'UPPERCASETRACEID' },
    archiveEnabled: false,
    storageCapabilities: null,
    criticalPathEnabled: false,
    disableJsonView: false,
    useOtelTerms: false,
    archiveTraceState: null,
    embedded: null,
    id: 'UPPERCASETRACEID',
    searchUrl: null,
    trace: null,
    uiFind: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes uppercase trace ID to lowercase via history.replace and does not call fetchTrace', () => {
    const replaceMock = jest.fn();
    const props = {
      ...defaultProps,
      history: {
        ...defaultProps.history,
        replace: replaceMock,
      },
    };

    render(<TracePageImpl {...props} />);

    expect(replaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining('uppercasetraceid'),
      })
    );
    expect(props.fetchTrace).not.toHaveBeenCalled();
  });

  it('preserves uiFind query parameter when normalizing ID', () => {
    const replaceMock = jest.fn();
    const props = {
      ...defaultProps,
      uiFind: 'error',
      location: {
        ...defaultProps.location,
        search: '?uiFind=error',
      },
      history: {
        ...defaultProps.history,
        replace: replaceMock,
      },
    };

    render(<TracePageImpl {...props} />);

    expect(replaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining('uppercasetraceid'),
        search: expect.stringContaining('uiFind=error'),
      })
    );
  });

  it('preserves location state when normalizing ID', () => {
    const replaceMock = jest.fn();
    const mockedState = { fromSearch: '/search' };
    const props = {
      ...defaultProps,
      location: {
        ...defaultProps.location,
        state: mockedState,
      },
      history: {
        ...defaultProps.history,
        replace: replaceMock,
      },
    };

    render(<TracePageImpl {...props} />);

    expect(replaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining('uppercasetraceid'),
        state: mockedState,
      })
    );
  });

  it('does not normalize if ID is already lowercase', () => {
    const replaceMock = jest.fn();
    const props = {
      ...defaultProps,
      id: 'lowercasetraceid',
      params: { id: 'lowercasetraceid' },
      history: {
        ...defaultProps.history,
        replace: replaceMock,
      },
    };

    render(<TracePageImpl {...props} />);

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('calls fetchTrace when trace ID is already lowercase', () => {
    const replaceMock = jest.fn();
    const props = {
      ...defaultProps,
      params: { id: 'lowercasetraceid' },
      id: 'lowercasetraceid',
      history: {
        ...defaultProps.history,
        replace: replaceMock,
      },
    };

    render(<TracePageImpl {...props} />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(props.fetchTrace).toHaveBeenCalledWith('lowercasetraceid');
  });
});
