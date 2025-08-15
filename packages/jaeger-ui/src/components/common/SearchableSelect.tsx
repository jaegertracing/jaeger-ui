// Copyright (c) 2023 The Jaeger Authors
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

import React, { FunctionComponent, useCallback, useEffect } from 'react';
import { Select, SelectProps } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import './SearchableSelect.css';

export const filterOptionsByLabel = (input: string, option?: DefaultOptionType) => {
  return (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase());
};

interface ISearchableSelectProps extends SelectProps {
  showScrollButtons?: boolean;
}

const SearchableSelect: FunctionComponent<ISearchableSelectProps> = ({ showScrollButtons, ...props }) => {
  const scrollUp = useCallback(() => {
    // DOM manipulation for browser specific scrolling, difficult to test in Jest environment
    /* istanbul ignore next */
    const dropdown = document.querySelector('.ant-select-dropdown .rc-virtual-list-holder');
    /* istanbul ignore next */
    if (dropdown) {
      /* istanbul ignore next */
      dropdown.scrollBy({ top: -100, behavior: 'auto' });
    }
  }, []);

  const scrollDown = useCallback(() => {
    // DOM manipulation for browser specific scrolling, difficult to test in Jest environment
    /* istanbul ignore next */
    const dropdown = document.querySelector('.ant-select-dropdown .rc-virtual-list-holder');
    /* istanbul ignore next */
    if (dropdown) {
      /* istanbul ignore next */
      dropdown.scrollBy({ top: 100, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    if (!showScrollButtons) return;

    const addScrollButtons = () => {
      const dropdown = document.querySelector('.ant-select-dropdown') as HTMLElement;
      if (dropdown && !dropdown.querySelector('.SearchableSelect--scrollButtons')) {
        dropdown.style.position = 'relative';

        const scrollButtons = document.createElement('div');
        scrollButtons.className = 'SearchableSelect--scrollButtons';
        scrollButtons.innerHTML = `
          <button type="button" class="SearchableSelect--scrollButton" data-testid="scroll-up-button" title="Scroll Up">
            <svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor">
              <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"/>
            </svg>
          </button>
          <button type="button" class="SearchableSelect--scrollButton" data-testid="scroll-down-button" title="Scroll Down">
            <svg viewBox="0 0 512 512" width="12" height="12" fill="currentColor">
              <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
            </svg>
          </button>
        `;

        const upButton = scrollButtons.querySelector('[data-testid="scroll-up-button"]');
        const downButton = scrollButtons.querySelector('[data-testid="scroll-down-button"]');

        upButton?.addEventListener('click', scrollUp);
        downButton?.addEventListener('click', scrollDown);

        dropdown.appendChild(scrollButtons);
      }
    };

    const observer = new MutationObserver(() => {
      addScrollButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // eslint-disable-next-line consistent-return
    return () => {
      observer.disconnect();
    };
  }, [showScrollButtons, scrollUp, scrollDown]);

  return <Select showSearch filterOption={filterOptionsByLabel} {...props} />;
};

export default SearchableSelect;
