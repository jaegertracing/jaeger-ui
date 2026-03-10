// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';

import { mapStateToProps, TopNavImpl as TopNav } from './TopNav';

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');

  const Menu = ({ items = [], selectedKeys = [] }) => (
    <nav data-testid="mock-menu" data-selectedkeys={JSON.stringify(selectedKeys)}>
      {items.map(item => (
        <div data-testid="mock-menu-item" key={item?.key || item?.label} data-key={item?.key || item?.label}>
          {item?.label}
        </div>
      ))}
    </nav>
  );

  const Dropdown = ({ menu, children }) => (
    <div data-testid="mock-dropdown">
      {children}
      <div data-testid="mock-dropdown-menu">
        {menu?.items?.map(entry => (
          <div key={entry?.key || entry?.label} data-disabled={entry?.disabled ? 'true' : 'false'}>
            {entry?.label}
          </div>
        ))}
      </div>
    </div>
  );

  return { ...actual, Menu, Dropdown };
});

jest.mock('../../utils/config/get-config', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      qualityMetrics: {
        apiEndpoint: '/quality-metrics',
      },
    })),
    getConfigValue: jest.fn(key => {
      switch (key) {
        case 'dependencies.menuEnabled':
        case 'deepDependencies.menuEnabled':
        case 'qualityMetrics.menuEnabled':
        case 'storageCapabilities.metricsStorage':
        case 'themes.enabled':
          return true;
        case 'qualityMetrics.menuLabel':
          return 'Quality';
        default:
          return false;
      }
    }),
  };
});

describe('<TopNav>', () => {
  const labelGitHub = 'GitHub';
  const githubUrl = 'https://github.com/uber/jaeger';
  const blogUrl = 'https://medium.com/jaegertracing/';
  const labelAbout = 'About Jaeger';
  const dropdownItems = [
    {
      label: 'Version 1',
    },
    {
      label: 'Docs',
      url: 'http://jaeger.readthedocs.io/en/latest/',
    },
    {
      label: 'Twitter',
      url: 'https://twitter.com/JaegerTracing',
      anchorTarget: '_self',
    },
  ];

  const configMenuGroup = {
    label: labelAbout,
    items: dropdownItems,
  };

  const defaultProps = {
    config: {
      menu: [
        {
          label: labelGitHub,
          url: githubUrl,
          anchorTarget: '_self',
        },
        {
          label: 'Blog',
          url: blogUrl,
        },
        {
          label: 'Docs',
          url: 'http://jaeger.readthedocs.io/en/latest/',
        },
        configMenuGroup,
      ],
    },
    router: {
      location: { pathname: '/search' },
    },
    pathname: '/search',
    traceDiff: {},
  };

  describe('renders the default menu options', () => {
    let component;
    beforeEach(() => {
      component = render(
        <BrowserRouter>
          <CompatRouter>
            <TopNav {...defaultProps} />
          </CompatRouter>
        </BrowserRouter>
      );
    });

    afterEach(() => {
      component.unmount();
    });

    it('renders the "Jaeger" link', () => {
      const items = screen.getByRole('link', { name: /jaeger logo jaeger/i });
      expect(items).toBeInTheDocument();
    });

    it('renders the "Search" button', () => {
      const items = screen.getByRole('link', { name: 'Search' });
      expect(items).toBeInTheDocument();
    });

    it('renders the "System Architecture" button', () => {
      const items = screen.getByRole('link', { name: 'System Architecture' });
      expect(items).toBeInTheDocument();
    });

    it('renders the "Service Dependencies" button', () => {
      const item = screen.getByRole('link', { name: 'Service Dependencies' });
      expect(item).toBeInTheDocument();
    });

    it('renders the "Quality" button', () => {
      const item = screen.getByRole('link', { name: 'Quality' });
      expect(item).toBeInTheDocument();
    });

    it('renders the theme toggle button', () => {
      const toggle = screen.getByRole('button', { name: /toggle color mode/i });
      expect(toggle).toBeInTheDocument();
    });
  });

  describe('renders the custom menu', () => {
    let component;
    beforeEach(() => {
      component = render(
        <BrowserRouter>
          <CompatRouter>
            <TopNav {...defaultProps} />
          </CompatRouter>
        </BrowserRouter>
      );
    });

    afterEach(() => {
      component.unmount();
    });

    it('renders the top-level item', () => {
      const item = screen.getByRole('link', { name: labelGitHub });
      expect(item).toBeInTheDocument();
      expect(item.href).toBe(githubUrl);
    });

    it('renders the nested menu items', () => {
      const item = screen.getAllByText(labelAbout)[0];
      expect(item).toBeInTheDocument();
    });

    it('adds target=_self to top-level item', () => {
      const item = screen.getByRole('link', { name: labelGitHub });
      expect(item.target).toBe('_self');
    });

    it('sets target=_blank by default', () => {
      const item = screen.getByRole('link', { name: 'Blog' });
      expect(item.target).toBe('_blank');
    });

    describe('<CustomNavDropdown>', () => {
      it('renders sub-menu text', () => {
        dropdownItems.slice(0, 1).forEach(itemConfig => {
          const dropdownEntry = screen.getByText(itemConfig.label).closest('[data-disabled]');
          expect(dropdownEntry).toHaveAttribute('data-disabled', 'true');
        });
      });

      it('renders sub-menu links', () => {
        dropdownItems.slice(1, 2).forEach(itemConfig => {
          const matches = screen.getAllByRole('link', { name: itemConfig.label });
          const item = matches[matches.length - 1];
          expect(item).toBeInTheDocument();
          expect(item.href).toBe(itemConfig.url);
          expect(item.target).toBe(itemConfig.anchorTarget || '_blank');
        });
      });
    });
  });

  it('highlights the nav item matching the current pathname', () => {
    render(
      <BrowserRouter>
        <CompatRouter>
          <TopNav {...defaultProps} />
        </CompatRouter>
      </BrowserRouter>
    );

    const navMenu = screen.getAllByTestId('mock-menu')[0];
    expect(navMenu).toHaveAttribute('data-selectedkeys', JSON.stringify(['/search']));
  });

  it('builds the Compare link using the trace diff cohort state', () => {
    render(
      <BrowserRouter>
        <CompatRouter>
          <TopNav
            {...{
              ...defaultProps,
              traceDiff: { cohort: ['trace-a', 'trace-b'] },
            }}
          />
        </CompatRouter>
      </BrowserRouter>
    );

    const compareLink = screen.getByRole('link', { name: 'Compare' });
    expect(compareLink.href).toContain('/trace/trace-a...trace-b');
    expect(compareLink.href).toContain('cohort=trace-a');
    expect(compareLink.href).toContain('cohort=trace-b');
  });

  it('renders the Monitor navigation link when enabled', () => {
    render(
      <BrowserRouter>
        <CompatRouter>
          <TopNav {...defaultProps} />
        </CompatRouter>
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: 'Monitor' })).toBeInTheDocument();
  });

  it('includes the Trace ID search control in the right-side menu', () => {
    render(
      <BrowserRouter>
        <CompatRouter>
          <TopNav {...defaultProps} />
        </CompatRouter>
      </BrowserRouter>
    );

    expect(screen.getByTestId('TraceIDSearchInput--form')).toBeInTheDocument();
  });
});

describe('mapStateToProps', () => {
  it('returns entire state', () => {
    const testState = {};
    expect(mapStateToProps(testState)).toBe(testState);
  });
});
