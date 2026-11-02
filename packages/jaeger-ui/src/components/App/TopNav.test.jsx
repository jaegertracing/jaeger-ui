// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { TopNavImpl as TopNav } from './TopNav';
import { useTraceDiffStore } from '../../stores/trace-diff-store';

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');

  const Menu = ({ items = [], selectedKeys = [], className }) => (
    <nav data-testid="mock-menu" className={className} data-selectedkeys={JSON.stringify(selectedKeys)}>
      {items.map(item => (
        <div data-testid="mock-menu-item" key={item?.key || item?.label} data-key={item?.key || item?.label}>
          {item?.label}
          {item?.children && <Menu items={item.children} />}
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

const { useConfigMock, useJaegerAssistantConfiguredMock } = vi.hoisted(() => ({
  useConfigMock: jest.fn(),
  useJaegerAssistantConfiguredMock: jest.fn(),
}));

vi.mock('../../hooks/useConfig', () => ({
  useConfig: (...args) => useConfigMock(...args),
}));

vi.mock('../../hooks/useJaegerAssistant', () => ({
  useJaegerAssistantConfigured: () => useJaegerAssistantConfiguredMock(),
  useJaegerAssistantEnabled: () => false,
}));

vi.mock('../../utils/config/get-config', async () => {
  return {
    default: jest.fn(() => ({
      dependencies: { menuEnabled: true },
      deepDependencies: { menuEnabled: true },
      qualityMetrics: {
        menuEnabled: true,
        menuLabel: 'Quality',
        apiEndpoint: '/quality-metrics',
      },
      backendCapabilities: { metricsStorage: true },
      themes: { enabled: true },
    })),
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
      themes: { enabled: true },
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
  };

  beforeEach(() => {
    useTraceDiffStore.setState({ a: null, b: null, cohort: [] });
    useConfigMock.mockReset();
    useConfigMock.mockReturnValue(defaultProps.config);
    useJaegerAssistantConfiguredMock.mockReset();
    useJaegerAssistantConfiguredMock.mockReturnValue(false);
  });

  describe('renders the default menu options', () => {
    let component;
    beforeEach(() => {
      component = render(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );
    });

    afterEach(() => {
      component.unmount();
    });

    it('renders the "Jaeger" link', () => {
      const items = screen.getByRole('link', { name: /jaeger logo ?jaeger/i });
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
          <TopNav {...defaultProps} />
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
        <TopNav {...defaultProps} />
      </BrowserRouter>
    );

    const navMenu = screen.getAllByTestId('mock-menu')[0];
    expect(navMenu).toHaveAttribute('data-selectedkeys', JSON.stringify(['/search']));
  });

  it('builds the Compare link using the trace diff cohort state', () => {
    useTraceDiffStore.setState({
      a: 'trace-a',
      b: 'trace-b',
      cohort: ['trace-a', 'trace-b'],
    });
    render(
      <BrowserRouter>
        <TopNav {...defaultProps} />
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
        <TopNav {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: 'Monitor' })).toBeInTheDocument();
  });

  it('includes the Trace ID search control in the right-side menu', () => {
    render(
      <BrowserRouter>
        <TopNav {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByTestId('TraceIDSearchInput--form')).toBeInTheDocument();
  });

  it('includes the Ask Jaeger area in the right-side menu when the assistant is configured', () => {
    useJaegerAssistantConfiguredMock.mockReturnValue(true);
    render(
      <BrowserRouter>
        <TopNav {...defaultProps} />
      </BrowserRouter>
    );

    const rightMenu = screen.getAllByTestId('mock-menu')[1];
    const askArea = rightMenu.querySelector('[data-key="JaegerAskArea"] .TopNav--askArea');
    expect(within(askArea).getByTestId('JaegerAskSearchInput--textarea')).toBeInTheDocument();
    expect(screen.queryByTestId('TraceIDSearchInput--form')).not.toBeInTheDocument();
  });

  it('omits the theme toggle from both menus when themes are disabled', () => {
    useConfigMock.mockReturnValue({ ...defaultProps.config, themes: { enabled: false } });
    render(
      <BrowserRouter>
        <TopNav {...defaultProps} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(document.querySelector('.TopNav--morePanel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle color mode/i })).not.toBeInTheDocument();
  });

  it('applies the layout classes to the left and right menus', () => {
    render(
      <BrowserRouter>
        <TopNav {...defaultProps} />
      </BrowserRouter>
    );

    const [leftMenu, rightMenu] = screen.getAllByTestId('mock-menu');
    expect(leftMenu).toHaveClass('Menu--item--left');
    expect(rightMenu).toHaveClass('Menu--item--right');
  });

  describe('"More options" panel', () => {
    const openPanel = () => {
      fireEvent.click(screen.getByRole('button', { name: 'More options' }));
      return document.querySelector('.TopNav--morePanel');
    };

    it('is closed by default', () => {
      render(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
      expect(document.querySelector('.TopNav--morePanel')).not.toBeInTheDocument();
    });

    it('holds the right menu items when opened', () => {
      render(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );

      const panel = openPanel();
      expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'true');
      expect(within(panel).getByTestId('TraceIDSearchInput--form')).toBeInTheDocument();
      expect(within(panel).getByRole('link', { name: labelGitHub })).toHaveAttribute('href', githubUrl);
      expect(within(panel).getByRole('link', { name: 'Blog' })).toHaveAttribute('href', blogUrl);
      expect(within(panel).getByRole('button', { name: /toggle color mode/i })).toBeInTheDocument();
    });

    it('closes when the button is clicked again', () => {
      render(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );

      openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'More options' }));
      expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('lists the items of a menu group in place of its dropdown', () => {
      render(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );

      const panel = openPanel();
      expect(within(panel).queryByTestId('mock-dropdown')).not.toBeInTheDocument();
      const group = within(panel).getByText(labelAbout).closest('[data-testid="mock-menu-item"]');
      expect(within(group).getByText('Version 1')).toBeInTheDocument();
      expect(within(group).getByRole('link', { name: 'Twitter' })).toHaveAttribute('target', '_self');
      // Keyed under the group, so they don't clash with a top-level item of the same label
      expect(within(group).getByRole('link', { name: 'Docs' }).closest('[data-key]')).toHaveAttribute(
        'data-key',
        `${labelAbout}/Docs`
      );
    });

    it('closes when the page changes', () => {
      const { rerender } = render(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );

      openPanel();
      rerender(
        <BrowserRouter>
          <TopNav {...defaultProps} pathname="/trace/abc123" />
        </BrowserRouter>
      );
      expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('stays closed when returning to the page it was opened on', () => {
      const { rerender } = render(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );

      openPanel();
      rerender(
        <BrowserRouter>
          <TopNav {...defaultProps} pathname="/trace/abc123" />
        </BrowserRouter>
      );
      rerender(
        <BrowserRouter>
          <TopNav {...defaultProps} />
        </BrowserRouter>
      );
      expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
