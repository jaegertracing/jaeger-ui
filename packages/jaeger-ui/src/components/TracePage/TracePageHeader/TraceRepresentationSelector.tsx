// Copyright (c) 2023 The Jaeger Authors.
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

import * as React from 'react';
import { Dropdown, Button, Tooltip } from 'antd';
import { IoChevronDown } from 'react-icons/io5';
import { TraceRepresentation } from '../../../types/config';
import './TraceRepresentationSelector.css';

type Props = {
  representations: TraceRepresentation[];
  currentRepresentation: string;
  onRepresentationChange: (representation: TraceRepresentation) => void;
};

export default function TraceRepresentationSelector(props: Props) {
  const { representations, currentRepresentation, onRepresentationChange } = props;

  if (!representations || representations.length <= 1) {
    return null;
  }

  const handleSelectRepresentation = (representation: TraceRepresentation) => {
    onRepresentationChange(representation);
  };

  const dropdownItems = representations.map(representation => ({
    key: representation.name,
    label: (
      <Tooltip title={representation.description}>
        <a
          onClick={() => handleSelectRepresentation(representation)}
          role="button"
          className={representation.name === currentRepresentation ? 'active-representation' : ''}
        >
          {representation.name}
        </a>
      </Tooltip>
    ),
  }));

  const currentItem = representations.find(r => r.name === currentRepresentation);
  const dropdownText = currentItem ? currentItem.name : 'Trace Representation';

  return (
    <Dropdown menu={{ items: dropdownItems }}>
      <Button className="TraceRepresentationSelector">
        {`${dropdownText} `}
        <IoChevronDown />
      </Button>
    </Dropdown>
  );
}