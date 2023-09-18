// Copyright (c) 2017 Uber Technologies, Inc.
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
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { mapStateToProps, TopNavImpl as TopNav } from './TopNav';

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
      location: { location: { pathname: 'some-path' } },
    },
    traceDiff: {},
  };

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

    it('renders the "JAEGER UI" link', () => {
      const items = screen.getByRole('link', { name: 'JAEGER UI' });
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
      let component;
      beforeEach(() => {
        component = render(<TopNav.CustomNavDropdown {...configMenuGroup} />);
      });

      afterEach(() => {
        component.unmount();
      });

      it('renders sub-menu text', () => {
        dropdownItems.slice(0, 0).forEach(itemConfig => {
          const item = screen.getByText(itemConfig.label);
          expect(item).toBeInTheDocument();
          expect(item.disabled).toBe(true);
        });
      });

      it('renders sub-menu links', () => {
        dropdownItems.slice(1, 2).forEach(itemConfig => {
          const item = screen.getByRole('link', { name: itemConfig.label });
          expect(item).toBeInTheDocument();
          expect(item.href).toBe(itemConfig.url);
          expect(item.target).toBe(itemConfig.anchorTarget || '_blank');
        });
      });
    });
  });
});

describe('mapStateToProps', () => {
  it('returns entire state', () => {
    const testState = {};
    expect(mapStateToProps(testState)).toBe(testState);
  });
});
