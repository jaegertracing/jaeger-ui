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
import { shallow } from 'enzyme';
import { Link, BrowserRouter as Router } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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
        configMenuGroup,
      ],
    },
    router: {
      location: { location: { pathname: 'some-path ' } },
    },
    traceDiff: {},
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TopNav {...defaultProps} />);
  });

  describe('renders the default menu options', () => {
    it('renders the "JAEGER UI" link', () => {
      render(
        <Router>
          <TopNav {...defaultProps} />
        </Router>
      );
      const jaegerLink = screen.getAllByText('JAEGER UI');
      expect(jaegerLink[0]).toBeInTheDocument();
    });
  
    it('renders the "Search" button', () => {
      render(
        <Router>
          <TopNav {...defaultProps} />
        </Router>
      );
      const searchLink = screen.getByText('Search');
      expect(searchLink).toBeInTheDocument();
    });
  
    it('renders the "System Architecture" button', () => {
      render(
        <Router>
          <TopNav {...defaultProps} />
        </Router>
      );
      const systemArchitectureLink = screen.getByText('System Architecture');
      expect(systemArchitectureLink).toBeInTheDocument();
    });
  });

  describe('renders the custom menu', () => {

    render(
      <Router>
        <TopNav {...defaultProps} />
      </Router>
    );
    
    const aboutJaegerElement = screen.getByText(labelAbout);
    expect(aboutJaegerElement).toBeInTheDocument();

    // Hover over the "About Jaeger" element
    fireEvent.mouseEnter(aboutJaegerElement);

    // Now, test the dropdown items
    const versionItem = screen.getByText('Version 1');
    const docsItem = screen.getByText('Docs');
    const twitterItem = screen.getByText('Twitter');

    expect(versionItem).toBeInTheDocument();
    expect(docsItem).toBeInTheDocument();
    expect(twitterItem).toBeInTheDocument();
    
  });
});

describe('mapStateToProps', () => {
  it('returns entire state', () => {
    const testState = {};
    expect(mapStateToProps(testState)).toBe(testState);
  });
});
