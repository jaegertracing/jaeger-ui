// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ExternalLinks from './ExternalLinks';

describe('<ExternalLinks>', () => {
  describe('renders multiple links correctly', () => {
    it('renders dropdown with multiple links', () => {
      const links = [
        { url: 'http://nowhere/', text: 'some text' },
        { url: 'http://other/', text: 'other text' },
        { url: 'http://link/', text: 'link text' },
      ];

      render(<ExternalLinks links={links} />);

      // The dropdown should be rendered
      const dropdown = screen.getByTestId('dropdown');
      expect(dropdown).toBeInTheDocument();

      // Open the dropdown and check the rendered links
      fireEvent.click(dropdown);

      const dropdownLinks = screen.getAllByRole('link');
      expect(dropdownLinks).toHaveLength(links.length);
      links.forEach(({ text, url }, index) => {
        expect(dropdownLinks[index]).toHaveAttribute('href', url);
        expect(dropdownLinks[index]).toHaveAttribute('title', text);
      });
    });

    it('renders one link correctly', () => {
      const links = [{ url: 'http://nowhere/', text: 'some text' }];
      render(<ExternalLinks links={links} />);

      // There should be no dropdown rendered
      expect(screen.queryByTestId('dropdown')).toBeNull();

      // There should be one link rendered with the correct title and href
      expect(screen.getByRole('link', { title: links[0].text })).toHaveAttribute('href', links[0].url);
    });
  });
});
