// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgDefEntry from './SvgDefEntry';

// Track mock calls
const mockAssignMergeCssResults = [];
const mockGetPropsResults = [];

jest.mock('./utils', () => ({
  assignMergeCss: (...args) => {
    const result = Object.assign({}, ...args.filter(Boolean));
    mockAssignMergeCssResults.push({ args, result });
    return result;
  },
  getProps: (...args) => {
    mockGetPropsResults.push(args);
    return args[0] ? { 'data-custom': 'entry-prop' } : null;
  },
  // getValueScaler is called at module load time, so we provide a simple mock
  getValueScaler: () => k => 0.5,
}));

describe('SvgDefEntry', () => {
  const createGraphState = (zoomK = 1) => ({
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
    zoomTransform: { k: zoomK },
    vertices: [],
    edges: [],
    layoutPhase: 'Done',
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    graphState: createGraphState(),
    localId: 'test-marker',
  };

  beforeEach(() => {
    mockAssignMergeCssResults.length = 0;
    mockGetPropsResults.length = 0;
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} />
          </defs>
        </svg>
      );
      expect(container).toBeTruthy();
    });

    it('renders default marker when no renderEntry provided', () => {
      const { container } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} />
          </defs>
        </svg>
      );
      const marker = container.querySelector('marker');
      expect(marker).toBeTruthy();
    });

    it('renders custom element when renderEntry is provided', () => {
      const customRender = (graphState, entryProps, id) => <circle id={id} r="5" {...entryProps} />;
      const { container } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} renderEntry={customRender} />
          </defs>
        </svg>
      );
      const circle = container.querySelector('circle');
      expect(circle).toBeTruthy();
    });
  });

  describe('id generation', () => {
    it('generates global id using renderUtils.getGlobalId', () => {
      const { container } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} localId="my-marker" />
          </defs>
        </svg>
      );
      const marker = container.querySelector('marker');
      expect(marker.id).toBe('global-my-marker');
    });

    it('passes generated id to custom renderEntry', () => {
      const customRender = jest.fn((graphState, entryProps, id) => <rect id={id} />);
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} localId="custom-id" renderEntry={customRender} />
          </defs>
        </svg>
      );
      expect(customRender).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'global-custom-id');
    });
  });

  describe('className', () => {
    it('applies className from getClassName prop', () => {
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} />
          </defs>
        </svg>
      );
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.className).toBe('test-DefEntry');
    });

    it('uses custom getClassName function', () => {
      const customGetClassName = name => `prefix-${name}-suffix`;
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} getClassName={customGetClassName} />
          </defs>
        </svg>
      );
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.className).toBe('prefix-DefEntry-suffix');
    });
  });

  describe('setOnEntry prop', () => {
    it('calls getProps with setOnEntry and graphState', () => {
      const mockSetOnEntry = jest.fn();
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} setOnEntry={mockSetOnEntry} />
          </defs>
        </svg>
      );
      expect(mockGetPropsResults[0][0]).toBe(mockSetOnEntry);
      expect(mockGetPropsResults[0][1]).toBe(defaultProps.graphState);
    });

    it('passes entryProps to renderEntry', () => {
      const mockSetOnEntry = jest.fn();
      const customRender = jest.fn((graphState, entryProps, id) => <rect id={id} {...entryProps} />);
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} setOnEntry={mockSetOnEntry} renderEntry={customRender} />
          </defs>
        </svg>
      );
      const entryProps = customRender.mock.calls[0][1];
      expect(entryProps).toEqual({ className: 'test-DefEntry', 'data-custom': 'entry-prop' });
    });

    it('handles undefined setOnEntry', () => {
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} setOnEntry={undefined} />
          </defs>
        </svg>
      );
      expect(mockGetPropsResults[0][0]).toBeUndefined();
    });
  });

  describe('default marker rendering', () => {
    it('renders marker element with correct attributes', () => {
      const { container } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} />
          </defs>
        </svg>
      );
      const marker = container.querySelector('marker');
      expect(marker.getAttribute('markerUnits')).toBe('userSpaceOnUse');
      expect(marker.getAttribute('orient')).toBe('auto');
    });

    it('renders path element inside marker', () => {
      const { container } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} />
          </defs>
        </svg>
      );
      const path = container.querySelector('marker > path');
      expect(path).toBeTruthy();
      expect(path.getAttribute('d')).toBeTruthy();
    });

    it('scales marker based on zoom transform', () => {
      // Test with different zoom levels
      const graphState1 = createGraphState(1);
      const { container: c1 } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} graphState={graphState1} />
          </defs>
        </svg>
      );
      const marker1 = c1.querySelector('marker');
      const height1 = marker1.getAttribute('markerHeight');

      const graphState2 = createGraphState(0.5);
      const { container: c2 } = render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} graphState={graphState2} />
          </defs>
        </svg>
      );
      const marker2 = c2.querySelector('marker');
      const height2 = marker2.getAttribute('markerHeight');

      // Both should have some height value (scaling logic is mocked)
      expect(height1).toBeTruthy();
      expect(height2).toBeTruthy();
    });
  });

  describe('renderEntry callback', () => {
    it('passes graphState to renderEntry', () => {
      const customRender = jest.fn((graphState, entryProps, id) => <rect id={id} />);
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} renderEntry={customRender} />
          </defs>
        </svg>
      );
      expect(customRender.mock.calls[0][0]).toBe(defaultProps.graphState);
    });

    it('passes entryProps to renderEntry', () => {
      const customRender = jest.fn((graphState, entryProps, id) => <rect id={id} />);
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} renderEntry={customRender} />
          </defs>
        </svg>
      );
      expect(customRender.mock.calls[0][1]).toEqual({ className: 'test-DefEntry' });
    });

    it('passes generated id to renderEntry', () => {
      const customRender = jest.fn((graphState, entryProps, id) => <rect id={id} />);
      render(
        <svg>
          <defs>
            <SvgDefEntry {...defaultProps} localId="entry-id" renderEntry={customRender} />
          </defs>
        </svg>
      );
      expect(customRender.mock.calls[0][2]).toBe('global-entry-id');
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      expect(SvgDefEntry.$$typeof).toBeDefined();
    });
  });
});
