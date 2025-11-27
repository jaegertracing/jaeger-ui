// Copyright (c) 2025 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useMemo } from 'react';
import { Col, Row, Select } from 'antd';
import JaegerAPI from '../../../api/jaeger';
import { getConfigValue } from '../../../utils/config/get-config';
import SearchableSelect from '../../common/SearchableSelect';
import './MultiTagSelector.css';

const { Option } = Select;

const MultiTagSelector = ({ service, onChange, disabled = false, value = '' }) => {
  const [tagValues, setTagValues] = useState({});
  const [loading, setLoading] = useState({});

  // Convert JSON string value to object format
  const valueAsObject = useMemo(() => {
    if (!value || typeof value !== 'string') return {};

    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Failed to parse tag JSON', e);
      return {};
    }
  }, [value]);

  const [selectedValues, setSelectedValues] = useState(valueAsObject);

  // Get tag attributes from config and memoize to prevent re-renders
  const tagAttributes = useMemo(() => {
    const attrs = getConfigValue('monitor.tagAttributes') || [];
    return attrs;
  }, []);

  // Fetch values for all attributes when dependencies change
  useEffect(() => {
    // Only fetch if we have attributes and a service
    if (!tagAttributes.length || !service) return;

    // Function to fetch values for a single attribute
    const fetchTagValuesForAttribute = async attributeName => {
      if (!attributeName) return;

      // Set loading state for this attribute
      setLoading(prev => ({ ...prev, [attributeName]: true }));

      try {
        // Fetch values from API
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

    // Fetch values for each attribute
    tagAttributes.forEach(attr => {
      fetchTagValuesForAttribute(attr.name);
    });
  }, [service, tagAttributes]);

  // Update selected values when value prop changes
  useEffect(() => {
    setSelectedValues(valueAsObject);
  }, [valueAsObject]);

  // Clean up selected values when tag attributes change
  useEffect(() => {
    const currentAttributeNames = tagAttributes.map(attr => attr.name);

    setSelectedValues(prevValues => {
      const cleanedValues = {};

      // Only keep values for attributes that are still in the config
      Object.entries(prevValues).forEach(([key, value]) => {
        if (currentAttributeNames.includes(key)) {
          cleanedValues[key] = value;
        }
      });

      return cleanedValues;
    });
  }, [tagAttributes]);

  // Handle value selection for a specific attribute
  const handleValueChange = (attributeName, selectedValue) => {
    // Pure state update function - no side effects
    setSelectedValues(prevValues => {
      const newSelectedValues = { ...prevValues };

      if (selectedValue) {
        newSelectedValues[attributeName] = selectedValue;
      } else {
        delete newSelectedValues[attributeName];
      }

      return newSelectedValues;
    });
  };

  // Use an effect to handle parent onChange when selectedValues change
  useEffect(() => {
    // Always output JSON format for consistency
    const tagCount = Object.keys(selectedValues).length;

    if (tagCount === 0) {
      onChange('');
    } else {
      onChange(JSON.stringify(selectedValues));
    }
  }, [selectedValues, onChange]);

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
              placeholder="Select"
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
