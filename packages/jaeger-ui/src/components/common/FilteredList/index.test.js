// Copyright (c) 2019 Uber Technologies, Inc.
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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Key as EKey } from 'ts-key-enum';

import FilteredList from './index';

jest.mock('react-window', () => {
  // eslint-disable-next-line no-shadow
  const React = jest.requireActual('react');
  return {
    FixedSizeList: ({ children, itemData, itemCount, onItemsRendered, onScroll }) => {
      const items = [];
      for (let i = 0; i < itemCount; i++) {
        items.push(
          React.createElement(children, {
            key: i,
            index: i,
            data: itemData,
            style: { height: 35 },
          })
        );
      }

      React.useEffect(() => {
        if (onItemsRendered) {
          onItemsRendered({
            visibleStartIndex: 0,
            visibleStopIndex: Math.min(itemCount - 1, 10),
          });
        }
      }, [itemCount, onItemsRendered]);

      return React.createElement(
        'div',
        {
          'data-testid': 'virtual-list',
          onScroll: onScroll ? () => onScroll({ scrollUpdateWasRequested: false }) : undefined,
        },
        items
      );
    },
  };
});

jest.mock('./ListItem', () => {
  // eslint-disable-next-line no-shadow
  const React = jest.requireActual('react');
  return ({ index, data }) => {
    const { options, setValue, selectedValue, addValues, removeValues, multi } = data;
    const option = options[index];
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      setIsFocused(data.focusedIndex === index);
    }, [data.focusedIndex, index]);

    const isSelected = selectedValue instanceof Set ? selectedValue.has(option) : selectedValue === option;

    return React.createElement(
      'div',
      {
        'data-testid': `list-item-${index}`,
        'data-option': option,
        'data-focused': isFocused,
        'data-selected': isSelected,
        onClick: () => {
          if (multi && addValues && removeValues) {
            if (isSelected) {
              removeValues([option]);
            } else {
              addValues([option]);
            }
          } else {
            setValue(option);
          }
        },
      },
      option
    );
  };
});

describe('<FilteredList>', () => {
  const words = ['and', 'apples', 'are'];
  const numbers = ['0', '1', '2'];
  let user;
  let props;

  const getFilterInput = () => screen.getByPlaceholderText('Filter...');
  const getCheckbox = () => screen.queryByRole('checkbox');
  const getListItems = () => screen.getAllByTestId(/^list-item-/);
  const getVirtualList = () => screen.getByTestId('virtual-list');

  beforeEach(() => {
    user = userEvent.setup();
    props = {
      cancel: jest.fn(),
      options: words.concat(numbers),
      value: null,
      setValue: jest.fn(),
    };
  });

  describe('rendering', () => {
    it('renders all required elements', () => {
      render(<FilteredList {...props} />);

      expect(getFilterInput()).toBeInTheDocument();
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(screen.getByPlaceholderText('Filter...')).toBeInTheDocument();
      expect(getListItems()).toHaveLength(props.options.length);
    });

    it('focuses input after component updates', async () => {
      const { rerender } = render(<FilteredList {...props} />);

      const input = getFilterInput();
      expect(input).not.toHaveFocus();

      rerender(<FilteredList {...props} value="anything" />);

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });

  describe('filtering', () => {
    it('filters options based on input text', async () => {
      render(<FilteredList {...props} />);

      expect(getListItems()).toHaveLength(props.options.length);

      await user.type(getFilterInput(), 'a');

      await waitFor(() => {
        const items = getListItems();
        expect(items).toHaveLength(words.length);
        words.forEach((word, index) => {
          expect(items[index]).toHaveAttribute('data-option', word);
        });
      });
    });

    it('clears filter and resets focus when value is set', async () => {
      render(<FilteredList {...props} />);

      await user.type(getFilterInput(), 'a');

      await waitFor(() => {
        expect(getListItems()).toHaveLength(words.length);
        expect(getFilterInput()).toHaveValue('a');
      });

      const firstItem = getListItems()[0];
      fireEvent.click(firstItem);

      expect(props.setValue).toHaveBeenCalledWith(words[0]);

      await waitFor(() => {
        expect(getFilterInput()).toHaveValue('');
        expect(getListItems()).toHaveLength(props.options.length);
      });
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('sets focus to first visible item on down arrow when no item is focused', async () => {
      render(<FilteredList {...props} />);

      const input = getFilterInput();
      input.focus();

      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();

      await waitFor(() => {
        const items = getListItems();
        expect(items[0]).toHaveAttribute('data-focused', 'true');
        items.slice(1).forEach(item => {
          expect(item).toHaveAttribute('data-focused', 'false');
        });
      });
    });

    it('cycles through items with arrow keys', async () => {
      render(<FilteredList {...props} />);

      const input = getFilterInput();
      input.focus();

      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();

      await waitFor(() => {
        expect(getListItems()[0]).toHaveAttribute('data-focused', 'true');
      });

      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();

      await waitFor(() => {
        const items = getListItems();
        expect(items[0]).toHaveAttribute('data-focused', 'false');
        expect(items[1]).toHaveAttribute('data-focused', 'true');
      });

      fireEvent.keyDown(input, { key: EKey.ArrowUp });
      jest.runAllTimers();

      await waitFor(() => {
        const items = getListItems();
        expect(items[0]).toHaveAttribute('data-focused', 'true');
        expect(items[1]).toHaveAttribute('data-focused', 'false');
      });
    });
  });

  describe('keyboard actions', () => {
    it('calls cancel and clears state on escape key', () => {
      render(<FilteredList {...props} />);

      const input = getFilterInput();
      input.focus();

      expect(props.cancel).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: EKey.Escape });

      expect(props.cancel).toHaveBeenCalledTimes(1);
    });

    it('selects focused item on enter key', async () => {
      render(<FilteredList {...props} />);

      const input = getFilterInput();
      input.focus();

      fireEvent.keyDown(input, { key: EKey.ArrowDown });

      await waitFor(() => {
        expect(getListItems()[0]).toHaveAttribute('data-focused', 'true');
      });

      expect(props.setValue).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: EKey.Enter });

      expect(props.setValue).toHaveBeenCalledTimes(1);
      expect(props.setValue).toHaveBeenCalledWith(props.options[0]);
    });

    it('selects single filtered option on enter key', async () => {
      render(<FilteredList {...props} />);

      const value = words[1];
      await user.type(getFilterInput(), value);

      await waitFor(() => {
        const items = getListItems();
        expect(items).toHaveLength(1);
        expect(items[0]).toHaveAttribute('data-option', value);
      });

      expect(props.setValue).not.toHaveBeenCalled();

      fireEvent.keyDown(getFilterInput(), { key: EKey.Enter });

      expect(props.setValue).toHaveBeenCalledTimes(1);
      expect(props.setValue).toHaveBeenCalledWith(value);
    });

    it('ignores enter key when no item is focused and multiple options exist', () => {
      render(<FilteredList {...props} />);

      const input = getFilterInput();
      input.focus();

      expect(props.setValue).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: EKey.Enter });

      expect(props.setValue).not.toHaveBeenCalled();
    });
  });

  describe('scrolling behavior', () => {
    it('clears focused item on scroll', async () => {
      jest.useFakeTimers();

      render(<FilteredList {...props} />);

      const input = getFilterInput();
      input.focus();

      fireEvent.keyDown(input, { key: EKey.ArrowDown });

      await waitFor(() => {
        expect(getListItems()[0]).toHaveAttribute('data-focused', 'true');
      });

      fireEvent.scroll(getVirtualList());
      jest.runAllTimers();

      await waitFor(() => {
        const items = getListItems();
        items.forEach(item => {
          expect(item).toHaveAttribute('data-focused', 'false');
        });
      });

      jest.useRealTimers();
    });
  });

  describe('multi-select mode', () => {
    let addValues;
    let removeValues;

    beforeEach(() => {
      addValues = jest.fn();
      removeValues = jest.fn();
    });

    describe('checkbox visibility', () => {
      it('hides checkbox when multi is false', () => {
        render(<FilteredList {...props} multi={false} addValues={addValues} removeValues={removeValues} />);
        expect(getCheckbox()).not.toBeInTheDocument();
      });

      it('hides checkbox when addValues is not provided', () => {
        render(<FilteredList {...props} multi removeValues={removeValues} />);
        expect(getCheckbox()).not.toBeInTheDocument();
      });

      it('hides checkbox when removeValues is not provided', () => {
        render(<FilteredList {...props} multi addValues={addValues} />);
        expect(getCheckbox()).not.toBeInTheDocument();
      });

      it('shows checkbox when multi mode is enabled with required callbacks', () => {
        render(<FilteredList {...props} multi addValues={addValues} removeValues={removeValues} />);
        expect(getCheckbox()).toBeInTheDocument();
      });
    });

    describe('checkbox states', () => {
      it('is unchecked when nothing is selected', () => {
        render(<FilteredList {...props} multi addValues={addValues} removeValues={removeValues} />);
        const checkbox = getCheckbox();
        expect(checkbox).not.toBeChecked();
        expect(checkbox).toHaveProperty('indeterminate', false);
      });

      it('is indeterminate when single item is selected', () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set([words[0]])}
          />
        );
        const checkbox = getCheckbox();
        expect(checkbox).not.toBeChecked();
        expect(checkbox).toHaveProperty('indeterminate', true);
      });

      it('is indeterminate when some items are selected', () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set(words)}
          />
        );
        const checkbox = getCheckbox();
        expect(checkbox).not.toBeChecked();
        expect(checkbox).toHaveProperty('indeterminate', true);
      });

      it('is checked when all items are selected', () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set([...words, ...numbers])}
          />
        );
        const checkbox = getCheckbox();
        expect(checkbox).toBeChecked();
        expect(checkbox).toHaveProperty('indeterminate', false);
      });
    });

    describe('filtered checkbox states', () => {
      it('is unchecked when no filtered items are selected', async () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set(words)}
          />
        );

        await user.type(getFilterInput(), numbers[0]);

        await waitFor(() => {
          const checkbox = getCheckbox();
          expect(checkbox).not.toBeChecked();
          expect(checkbox).toHaveProperty('indeterminate', false);
        });
      });

      it('is indeterminate when some filtered items are selected', async () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set([words[0]])}
          />
        );

        await user.type(getFilterInput(), words[0][0]);

        await waitFor(() => {
          const checkbox = getCheckbox();
          expect(checkbox).not.toBeChecked();
          expect(checkbox).toHaveProperty('indeterminate', true);
        });
      });

      it('is checked when all filtered items are selected', async () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set(words)}
          />
        );

        await user.type(getFilterInput(), words[0][0]);

        await waitFor(() => {
          const checkbox = getCheckbox();
          expect(checkbox).toBeChecked();
          expect(checkbox).toHaveProperty('indeterminate', false);
        });
      });
    });

    describe('checkbox interactions', () => {
      it('selects all unselected filtered items when clicked while unchecked', async () => {
        render(<FilteredList {...props} multi addValues={addValues} removeValues={removeValues} />);

        await user.type(getFilterInput(), words[0][0]);

        await waitFor(() => {
          expect(getCheckbox()).not.toBeChecked();
        });

        await user.click(getCheckbox());

        expect(addValues).toHaveBeenCalledTimes(1);
        expect(addValues).toHaveBeenCalledWith(words);
        expect(removeValues).not.toHaveBeenCalled();
      });

      it('deselects all filtered items when clicked while checked', async () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set(words)}
          />
        );

        await user.type(getFilterInput(), words[0][0]);

        await waitFor(() => {
          expect(getCheckbox()).toBeChecked();
        });

        await user.click(getCheckbox());

        expect(removeValues).toHaveBeenCalledTimes(1);
        expect(removeValues).toHaveBeenCalledWith(words);
        expect(addValues).not.toHaveBeenCalled();
      });

      it('selects remaining unselected filtered items when clicked while indeterminate', async () => {
        render(
          <FilteredList
            {...props}
            multi
            addValues={addValues}
            removeValues={removeValues}
            value={new Set([words[0]])}
          />
        );

        await user.type(getFilterInput(), words[0][0]);

        await waitFor(() => {
          const checkbox = getCheckbox();
          expect(checkbox).not.toBeChecked();
          expect(checkbox).toHaveProperty('indeterminate', true);
        });

        await user.click(getCheckbox());

        expect(addValues).toHaveBeenCalledTimes(1);
        expect(addValues).toHaveBeenCalledWith(words.slice(1));
        expect(removeValues).not.toHaveBeenCalled();
      });
    });
  });
});
