// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useMemo, useState } from 'react';
import { Checkbox, Input } from 'antd';
import { IoChevronDown } from 'react-icons/io5';

import { AvailableField, MAX_SUMMARY_FIELDS } from '../../TraceTimelineViewer/summaryFieldsUtils';

import './index.css';

type SummaryFieldsSelectProps = {
  availableFields: AvailableField[];
  selectedFields: string[];
  onSelectedFieldsChange: (fields: string[]) => void;
};

function buildTriggerLabel(selectedFields: string[]): string {
  if (selectedFields.length === 0) {
    return 'Select up to 3 fields...';
  }
  if (selectedFields.length === 1) {
    return selectedFields[0];
  }
  return `${selectedFields.length} fields selected`;
}

export default function SummaryFieldsSelect({
  availableFields,
  selectedFields,
  onSelectedFieldsChange,
}: SummaryFieldsSelectProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedFields), [selectedFields]);

  const filteredFields = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return availableFields;
    }
    return availableFields.filter(field => field.key.toLowerCase().includes(query));
  }, [availableFields, searchQuery]);

  const handleToggleExpanded = useCallback(() => {
    setExpanded(current => !current);
  }, []);

  const handleToggleField = useCallback(
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
    <div
      className="SummaryFieldsSelect"
      data-testid="summary-fields-select"
      onClick={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
    >
      <button
        aria-expanded={expanded}
        aria-haspopup="listbox"
        className="SummaryFieldsSelect--trigger"
        data-testid="summary-fields-trigger"
        onClick={handleToggleExpanded}
        title={selectedFields.join(', ')}
        type="button"
      >
        <span className="SummaryFieldsSelect--triggerLabel">{buildTriggerLabel(selectedFields)}</span>
        <span className="SummaryFieldsSelect--count">
          {selectedFields.length}/{MAX_SUMMARY_FIELDS}
        </span>
        <IoChevronDown
          aria-hidden
          className={`SummaryFieldsSelect--chevron ${expanded ? 'is-expanded' : ''}`}
        />
      </button>
      {expanded && (
        <div className="SummaryFieldsSelect--panel">
          <Input
            allowClear
            aria-label="Search attribute keys"
            className="SummaryFieldsSelect--search"
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search attribute keys..."
            value={searchQuery}
          />
          <div
            className="SummaryFieldsSelect--list"
            data-testid="summary-fields-list"
            role="group"
            aria-label="Summary field selection"
          >
            {filteredFields.length === 0 ? (
              <div className="SummaryFieldsSelect--empty">No matching fields</div>
            ) : (
              filteredFields.map(field => {
                const isSelected = selectedSet.has(field.key);
                const isDisabled = !isSelected && selectedFields.length >= MAX_SUMMARY_FIELDS;
                return (
                  <label
                    key={field.key}
                    className={`SummaryFieldsSelect--option ${isDisabled ? 'is-disabled' : ''}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => handleToggleField(field.key)}
                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${field.key} from summary fields`}
                    />
                    <span className="SummaryFieldsSelect--optionKey" title={field.key}>
                      {field.key}
                    </span>
                    <span className="SummaryFieldsSelect--coverage">
                      {field.coverage}/{field.total}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
