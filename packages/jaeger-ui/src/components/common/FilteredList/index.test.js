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
  let props;
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    props = {
      cancel: jest.fn(),
      options: words.concat(numbers),
      value: null,
      setValue: jest.fn(),
    };
  });

  it('renders without exploding', () => {
    render(<FilteredList {...props} />);
    expect(screen.getByPlaceholderText('Filter...')).toBeInTheDocument();
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('puts the focus on the input on update', async () => {
    const { rerender } = render(<FilteredList {...props} />);
    const input = screen.getByPlaceholderText('Filter...');
    expect(input).not.toHaveFocus();
    rerender(<FilteredList {...props} value="anything" />);
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('filters options based on the current input text', async () => {
    render(<FilteredList {...props} />);
    await user.type(screen.getByPlaceholderText('Filter...'), 'a');
    await waitFor(() => {
      const items = screen.getAllByTestId(/^list-item-/);
      expect(items).toHaveLength(words.length);
    });
  });

  it('setting the value clears the filter and focus index', async () => {
    render(<FilteredList {...props} />);
    await user.type(screen.getByPlaceholderText('Filter...'), 'a');
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Filter...')).toHaveValue('a');
    });
    fireEvent.click(screen.getAllByTestId(/^list-item-/)[0]);
    expect(props.setValue).toHaveBeenCalledWith(words[0]);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Filter...')).toHaveValue('');
      expect(screen.getAllByTestId(/^list-item-/)).toHaveLength(props.options.length);
    });
  });

  describe('up / down arrow keys', () => {
    beforeAll(() => jest.useFakeTimers());
    afterAll(() => jest.useRealTimers());

    it('down arrow sets the focus index to the first visible item when focusIndex == null', async () => {
      render(<FilteredList {...props} />);
      const input = screen.getByPlaceholderText('Filter...');
      input.focus();
      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();
      await waitFor(() => {
        const items = screen.getAllByTestId(/^list-item-/);
        expect(items[0]).toHaveAttribute('data-focused', 'true');
      });
    });

    it('shift the focus index to the next element', async () => {
      render(<FilteredList {...props} />);
      const input = screen.getByPlaceholderText('Filter...');
      input.focus();
      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();
      await waitFor(() => {
        const items = screen.getAllByTestId(/^list-item-/);
        expect(items[0]).toHaveAttribute('data-focused', 'true');
      });
      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();
      await waitFor(() => {
        const items = screen.getAllByTestId(/^list-item-/);
        expect(items[1]).toHaveAttribute('data-focused', 'true');
      });
    });

    it('cause the view to scroll if necessary', async () => {
      jest.useFakeTimers();
      try {
        render(<FilteredList {...props} />);
        const input = screen.getByPlaceholderText('Filter...');
        input.focus();

        jest.runAllTimers();

        fireEvent.keyDown(input, { key: EKey.ArrowDown });
        jest.runAllTimers();

        await waitFor(() => {
          expect(screen.getAllByTestId(/^list-item-/)[0]).toHaveAttribute('data-focused', 'true');
        });

        const totalItems = props.options.length;

        for (let i = 0; i < totalItems - 1; i++) {
          fireEvent.keyDown(input, { key: EKey.ArrowDown });
          jest.runAllTimers();
        }

        await waitFor(() => {
          expect(screen.getAllByTestId(/^list-item-/)[totalItems - 1]).toHaveAttribute(
            'data-focused',
            'true'
          );
        });

        for (let i = 0; i < totalItems - 1; i++) {
          fireEvent.keyDown(input, { key: EKey.ArrowUp });
          jest.runAllTimers();
        }

        await waitFor(() => {
          expect(screen.getAllByTestId(/^list-item-/)[0]).toHaveAttribute('data-focused', 'true');
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('multi mode checkbox', () => {
    let addValues;
    let removeValues;

    beforeEach(() => {
      addValues = jest.fn();
      removeValues = jest.fn();
      props = { ...props, multi: true, addValues, removeValues };
    });

    it('is omitted if multi is false or addValues or removeValues is not provided', () => {
      const { rerender } = render(
        <FilteredList {...props} multi={false} addValues={addValues} removeValues={removeValues} />
      );
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      rerender(<FilteredList {...props} multi addValues={undefined} removeValues={removeValues} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      rerender(<FilteredList {...props} multi addValues={addValues} removeValues={undefined} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('is present in multi mode', () => {
      render(<FilteredList {...props} />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('is unchecked if nothing is selected', () => {
      render(<FilteredList {...props} />);
      const cb = screen.getByRole('checkbox');
      expect(cb).not.toBeChecked();
      expect(cb).toHaveProperty('indeterminate', false);
    });

    it('is indeterminate if one is selected', () => {
      render(<FilteredList {...props} value={words[0]} />);
      const cb = screen.getByRole('checkbox');
      expect(cb).not.toBeChecked();
      expect(cb).toHaveProperty('indeterminate', true);
    });

    it('is indeterminate if some are selected', () => {
      render(<FilteredList {...props} value={new Set(words)} />);
      const cb = screen.getByRole('checkbox');
      expect(cb).not.toBeChecked();
      expect(cb).toHaveProperty('indeterminate', true);
    });

    it('is checked if all are selected', () => {
      render(<FilteredList {...props} value={new Set([...words, ...numbers])} />);
      const cb = screen.getByRole('checkbox');
      expect(cb).toBeChecked();
      expect(cb).toHaveProperty('indeterminate', false);
    });

    it('is unchecked if nothing filtered is selected', async () => {
      render(<FilteredList {...props} value={new Set(words)} />);
      await user.type(screen.getByPlaceholderText('Filter...'), numbers[0]);
      await waitFor(() => {
        const cb = screen.getByRole('checkbox');
        expect(cb).not.toBeChecked();
        expect(cb).toHaveProperty('indeterminate', false);
      });
    });

    it('is indeterminate if one filtered value is selected', async () => {
      render(<FilteredList {...props} value={words[0]} />);
      await user.type(screen.getByPlaceholderText('Filter...'), words[0][0]);
      await waitFor(() => {
        const cb = screen.getByRole('checkbox');
        expect(cb).not.toBeChecked();
        expect(cb).toHaveProperty('indeterminate', true);
      });
    });

    it('is indeterminate if some filtered values are selected', async () => {
      render(<FilteredList {...props} value={new Set(words.slice(1))} />);
      await user.type(screen.getByPlaceholderText('Filter...'), words[0][0]);
      await waitFor(() => {
        const cb = screen.getByRole('checkbox');
        expect(cb).not.toBeChecked();
        expect(cb).toHaveProperty('indeterminate', true);
      });
    });

    it('is checked if all filtered values are selected', async () => {
      render(<FilteredList {...props} value={new Set(words)} />);
      await user.type(screen.getByPlaceholderText('Filter...'), words[0][0]);
      await waitFor(() => {
        const cb = screen.getByRole('checkbox');
        expect(cb).toBeChecked();
        expect(cb).toHaveProperty('indeterminate', false);
      });
    });

    it('unselects all filtered values when clicked and checked', async () => {
      render(<FilteredList {...props} value={new Set(words)} />);
      await user.type(screen.getByPlaceholderText('Filter...'), words[0][0]);
      await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());
      await user.click(screen.getByRole('checkbox'));
      expect(removeValues).toHaveBeenCalledWith(words);
    });

    it('selects all filtered values when clicked and unchecked', async () => {
      render(<FilteredList {...props} />);
      await user.type(screen.getByPlaceholderText('Filter...'), words[0][0]);
      await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
      await user.click(screen.getByRole('checkbox'));
      expect(addValues).toHaveBeenCalledWith(words);
    });

    it('selects all unselected filtered values when clicked and unchecked', async () => {
      render(<FilteredList {...props} value={words[0]} />);
      await user.type(screen.getByPlaceholderText('Filter...'), words[0][0]);
      await waitFor(() => {
        const cb = screen.getByRole('checkbox');
        expect(cb).not.toBeChecked();
        expect(cb).toHaveProperty('indeterminate', true);
      });
      await user.click(screen.getByRole('checkbox'));
      expect(addValues).toHaveBeenCalledWith(words.slice(1));
    });
  });

  it('escape triggers cancel', () => {
    render(<FilteredList {...props} />);
    const input = screen.getByPlaceholderText('Filter...');
    input.focus();
    fireEvent.keyDown(input, { key: EKey.Escape });
    expect(props.cancel).toHaveBeenCalled();
  });

  it('enter selects the current focus index', async () => {
    jest.useFakeTimers();
    try {
      render(<FilteredList {...props} />);
      const input = screen.getByPlaceholderText('Filter...');
      input.focus();
      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();
      await waitFor(() => {
        expect(screen.getAllByTestId(/^list-item-/)[0]).toHaveAttribute('data-focused', 'true');
      });
      fireEvent.keyDown(input, { key: EKey.Enter });
      expect(props.setValue).toHaveBeenCalledWith(props.options[0]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('enter selects the filteredOption if there is only one option', async () => {
    render(<FilteredList {...props} />);
    await user.type(screen.getByPlaceholderText('Filter...'), words[1]);
    await waitFor(() => {
      const items = screen.getAllByTestId(/^list-item-/);
      expect(items).toHaveLength(1);
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Filter...'), { key: EKey.Enter });
    expect(props.setValue).toHaveBeenCalledWith(words[1]);
  });

  it('enter is ignored when an item is not focused', () => {
    render(<FilteredList {...props} />);
    const input = screen.getByPlaceholderText('Filter...');
    input.focus();
    fireEvent.keyDown(input, { key: EKey.Enter });
    expect(props.setValue).not.toHaveBeenCalled();
  });

  it('scrolling unsets the focus index', async () => {
    jest.useFakeTimers();
    try {
      render(<FilteredList {...props} />);
      const input = screen.getByPlaceholderText('Filter...');
      input.focus();
      fireEvent.keyDown(input, { key: EKey.ArrowDown });
      jest.runAllTimers();
      await waitFor(() => {
        expect(screen.getAllByTestId(/^list-item-/)[0]).toHaveAttribute('data-focused', 'true');
      });
      fireEvent.scroll(screen.getByTestId('virtual-list'));
      jest.runAllTimers();
      await waitFor(() => {
        screen.getAllByTestId(/^list-item-/).forEach(item => {
          expect(item).toHaveAttribute('data-focused', 'false');
        });
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
