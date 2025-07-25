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

import React, { useCallback, useMemo } from 'react';
import { Checkbox } from 'antd';
import cx from 'classnames';
import { ListChildComponentProps } from 'react-window';

import highlightMatches from './highlightMatches';

import './ListItem.css';

interface IListItemProps extends ListChildComponentProps {
  data: {
    addValues?: (values: string[]) => void;
    focusedIndex: number | null;
    highlightQuery: string;
    multi?: boolean;
    options: string[];
    removeValues?: (values: string[]) => void;
    selectedValue: Set<string> | string | null;
    setValue: (value: string) => void;
  };
}

const ListItem: React.FC<IListItemProps> = React.memo(props => {
  const { data, index, style: styleOrig } = props;
  const { addValues, focusedIndex, highlightQuery, multi, options, removeValues, selectedValue, setValue } =
    data;

  const value = options[index];

  const isSelected = useMemo(() => {
    if (typeof selectedValue === 'string' || !selectedValue) {
      return value === selectedValue;
    }
    return selectedValue.has(value);
  }, [value, selectedValue]);

  const onClicked = useCallback(() => {
    if (multi && addValues && removeValues) {
      if (isSelected) {
        removeValues([value]);
      } else {
        addValues([value]);
      }
    } else {
      setValue(value);
    }
  }, [multi, addValues, removeValues, isSelected, value, setValue]);

  const { width: _, ...style } = styleOrig;

  const cls = cx('FilteredList--ListItem', {
    'is-focused': index === focusedIndex,
    'is-selected': isSelected,
    'is-striped': index % 2,
  });

  return (
    <div
      className={cls}
      style={style}
      onClick={onClicked}
      role="switch"
      aria-checked={index === focusedIndex ? 'true' : 'false'}
    >
      {multi && <Checkbox className="FilteredList--ListItem--Checkbox" checked={isSelected} />}
      {highlightMatches(highlightQuery, value)}
    </div>
  );
});

export default ListItem;
