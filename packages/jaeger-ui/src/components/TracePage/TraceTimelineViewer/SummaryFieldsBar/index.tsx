// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useMemo, useState } from 'react';
import { Checkbox, Input, Tag } from 'antd';

import { IOtelTrace } from '../../../../types/otel';
import { AvailableField, buildAvailableFields, MAX_SUMMARY_FIELDS } from '../summaryFieldsUtils';

import './index.css';

type SummaryFieldsBarProps = {
  trace: IOtelTrace;
  selectedFields: string[];
  onSelectedFieldsChange: (fields: string[]) => void;
};

type FieldCheckboxProps = {
  field: AvailableField;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (key: string) => void;
};

function FieldCheckbox({ field, isSelected, isDisabled, onToggle }: FieldCheckboxProps) {
  return (
    <div className="SummaryFieldsBar--fieldItem">
      <Checkbox
        checked={isSelected}
        disabled={isDisabled}
        onChange={() => onToggle(field.key)}
        aria-label={`${isSelected ? 'Remove' : 'Add'} ${field.key} from summary fields`}
      >
        <span className="SummaryFieldsBar--fieldKey">{field.key}</span>
        <span className="SummaryFieldsBar--separator" aria-hidden="true"></span>
        <span className="SummaryFieldsBar--coverage">
          {field.coverage}/{field.total}
        </span>
      </Checkbox>
    </div>
  );
}

export default function SummaryFieldsBar({
  trace,
  selectedFields,
  onSelectedFieldsChange,
}: SummaryFieldsBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const availableFields = useMemo(() => buildAvailableFields(trace), [trace]);
  const selectedSet = useMemo(() => new Set(selectedFields), [selectedFields]);

  const filteredFields = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return availableFields;
    }
    return availableFields.filter(field => field.key.toLowerCase().includes(query));
  }, [availableFields, searchQuery]);

  const handleToggle = useCallback(
    (key: string) => {
      if (selectedSet.has(key)) {
        onSelectedFieldsChange(selectedFields.filter(field => field !== key));
        return;
      }
      if (selectedFields.length >= MAX_SUMMARY_FIELDS) {
        return;
      }
      onSelectedFieldsChange([...selectedFields, key]);
    },
    [onSelectedFieldsChange, selectedFields, selectedSet]
  );

  if (availableFields.length === 0) {
    return null;
  }

  return (
    <div className="SummaryFieldsBar" data-testid="summary-fields-bar">
      <span className="SummaryFieldsBar--label">Summary fields</span>
      <Tag className="SummaryFieldsBar--countTag" variant="outlined">
        {selectedFields.length} of {MAX_SUMMARY_FIELDS}
      </Tag>
      <div className="SummaryFieldsBar--fields" role="group" aria-label="Summary field selection">
        {filteredFields.map(field => {
          const isSelected = selectedSet.has(field.key);
          const isDisabled = !isSelected && selectedFields.length >= MAX_SUMMARY_FIELDS;
          return (
            <FieldCheckbox
              key={field.key}
              field={field}
              isDisabled={isDisabled}
              isSelected={isSelected}
              onToggle={handleToggle}
            />
          );
        })}
      </div>
      <Input
        allowClear
        className="SummaryFieldsBar--search"
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search attribute keys..."
        value={searchQuery}
      />
    </div>
  );
}
