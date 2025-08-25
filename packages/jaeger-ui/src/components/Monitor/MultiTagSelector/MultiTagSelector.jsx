// Copyright (c) 2025 The Jaeger Authors
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Col, Row, Select } from 'antd';
import JaegerAPI from '../../../api/jaeger';
import { getConfigValue } from '../../../utils/config/get-config';
import SearchableSelect from '../../common/SearchableSelect';
import './MultiTagSelector.css';

const { Option } = Select;

const MultiTagSelector = ({ service, onChange, disabled = false, value = '' }) => {
  const [tagValues, setTagValues] = useState({});
  const [loading, setLoading] = useState({});

  // Convert string value to object format
  const valueAsObject = useMemo(() => {
    if (!value || typeof value !== 'string') return {};

    const obj = {};
    value.split(' ').forEach(pair => {
      const [key, val] = pair.split('=');
      if (key && val) {
        obj[key] = val;
      }
    });
    return obj;
  }, [value]);

  const [selectedValues, setSelectedValues] = useState(valueAsObject);

  // Get tag attributes from config and memoize to prevent re-renders
  const tagAttributes = useMemo(() => {
    const attrs = getConfigValue('monitor.tagAttributes') || [];
    return attrs;
  }, []);

  // Fetch values for all attributes when dependencies change
  useEffect(() => {
    const fetchTagValuesForAttribute = async attributeName => {
      if (!attributeName) return;

      setLoading(prev => ({ ...prev, [attributeName]: true }));

      try {
        const values = await JaegerAPI.fetchTagValues(attributeName, service);
        setTagValues(prev => ({
          ...prev,
          [attributeName]: values || [],
        }));
      } catch (error) {
        console.error(`Error fetching values for attribute ${attributeName}:`, error);
        setTagValues(prev => ({
          ...prev,
          [attributeName]: [],
        }));
      } finally {
        setLoading(prev => ({ ...prev, [attributeName]: false }));
      }
    };

    // Only fetch if we have attributes
    if (tagAttributes.length > 0) {
      tagAttributes.forEach(attr => {
        fetchTagValuesForAttribute(attr.name);
      });
    }
  }, [service, tagAttributes]);

  // Update selected values when value prop changes
  useEffect(() => {
    setSelectedValues(valueAsObject);
  }, [valueAsObject]);

  // Handle value selection for a specific attribute
  const handleValueChange = useCallback((attributeName, selectedValue) => {
    setSelectedValues(prevValues => {
      const newSelectedValues = { ...prevValues };

      if (selectedValue) {
        newSelectedValues[attributeName] = selectedValue;
      } else {
        delete newSelectedValues[attributeName];
      }

      // Convert to tag string format
      const tagString = Object.entries(newSelectedValues)
        .map(([key, val]) => `${key}=${val}`)
        .join(' ');

      onChange(tagString);

      return newSelectedValues;
    });
  }, []); // Remove onChange from dependencies since it's used inside setState callback

  if (tagAttributes.length === 0) {
    return null;
  }

  return (
    <div className="multi-tag-selector">
      <Row gutter={16}>
        {tagAttributes.map(attribute => (
          <Col key={attribute.name}>
            <h2 className="tag-selector-header">{attribute.label}</h2>
            <SearchableSelect
              placeholder={`Select ${attribute.label.toLowerCase()}`}
              value={selectedValues[attribute.name] || undefined}
              onChange={val => handleValueChange(attribute.name, val)}
              loading={loading[attribute.name]}
              disabled={disabled}
              allowClear
              className="tag-selector"
            >
              {(tagValues[attribute.name] || []).map(val => (
                <Option key={val} value={val}>
                  {val}
                </Option>
              ))}
            </SearchableSelect>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MultiTagSelector;
