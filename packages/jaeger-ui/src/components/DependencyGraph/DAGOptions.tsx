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

import * as React from 'react';
import { Select, InputNumber, Popover, Button } from 'antd';
import { IoHelp } from 'react-icons/io5';
import SearchableSelect from '../common/SearchableSelect';
import UiFindInput from '../common/UiFindInput';
import './DAGOptions.css';
import { getAppEnvironment } from '../../utils/constants';

const { Option } = Select;

interface IDependency {
  parent: string;
  child: string;
  callCount: number;
}

interface IDAGOptionsProps {
  dependencies: IDependency[];
  onServiceSelect: (service: string) => void;
  onLayoutSelect: (layout: string) => void;
  onDepthChange: (value: number | null) => void;
  selectedService?: string;
  selectedLayout?: string;
  selectedDepth?: number;
  onReset: () => void;
  isHierarchicalDisabled: boolean;
  selectedSampleDatasetType: string;
  onSampleDatasetTypeChange: (type: string) => void;
  sampleDatasetTypes: string[];
  uiFind?: string;
  matchCount?: number;
}

const LAYOUT_OPTIONS = [
  { label: 'Hierarchical Layout', value: 'dot' },
  { label: 'Force Directed Layout', value: 'sfdp' },
];

const DAGOptions: React.FC<IDAGOptionsProps> = ({
  dependencies,
  onServiceSelect,
  onLayoutSelect,
  onDepthChange,
  selectedService,
  selectedLayout = 'dot',
  selectedDepth = 0,
  onReset,
  isHierarchicalDisabled,
  selectedSampleDatasetType,
  onSampleDatasetTypeChange,
  sampleDatasetTypes,
  uiFind,
  matchCount,
}) => {
  const services = React.useMemo(() => {
    const uniqueServices = new Set<string>();
    if (dependencies) {
      dependencies.forEach(dep => {
        uniqueServices.add(dep.parent);
        uniqueServices.add(dep.child);
      });
    }
    return Array.from(uniqueServices).sort((a, b) => a.localeCompare(b));
  }, [dependencies]);

  return (
    <div className="dag-options" data-testid="dag-options">
      <div className="selector-container">
        <div className="selector-label-container">
          <span className="selector-label">Layout</span>
          <Popover
            placement="topLeft"
            trigger="click"
            content={
              <div>
                <h3 className="hint-title">Layout Options</h3>
                <ul className="hint-info">
                  <li>Hierarchical Layout: Displays nodes in a top-down tree structure</li>
                  <li>Force Directed Layout: Uses physics simulation to position nodes</li>
                </ul>
              </div>
            }
          >
            <IoHelp className="hint-trigger" data-testid="layout-help-icon" />
          </Popover>
        </div>
        <Select
          className="layout-selector-input"
          value={selectedLayout}
          onChange={onLayoutSelect}
          placeholder="Select Layout"
          data-testid="layout-select"
        >
          {LAYOUT_OPTIONS.map(option => (
            <Option
              key={option.value}
              value={option.value}
              disabled={option.value === 'dot' && isHierarchicalDisabled}
              data-testid={`layout-option-${option.value}`}
            >
              {option.label}
            </Option>
          ))}
        </Select>
      </div>
      <div className="selector-container">
        <div className="selector-label-container">
          <span className="selector-label">Focal Service</span>
          <Popover
            placement="topLeft"
            trigger="click"
            content={
              <div>
                <ul className="hint-info">
                  <li>Select a service to focus on its dependencies</li>
                  <li>Shows direct connections to other services up to the nearest neighbors</li>
                </ul>
              </div>
            }
          >
            <IoHelp className="hint-trigger" data-testid="service-help-icon" />
          </Popover>
        </div>
        <SearchableSelect
          value={selectedService}
          onChange={onServiceSelect}
          placeholder="Select A Service"
          className="select-a-service-input"
          data-testid="service-select"
        >
          {services.map(service => (
            <Option key={service} value={service} data-testid={`service-option-${service}`}>
              {service}
            </Option>
          ))}
        </SearchableSelect>
      </div>
      <div className="selector-container">
        <div className="selector-label-container">
          <span className="selector-label">Depth</span>
          <Popover
            placement="topLeft"
            trigger="click"
            content={
              <div>
                <ul className="hint-info">
                  <li>Number of hops from Focal Service to display</li>
                  <li>
                    Higher values show more dependencies but may be less readable and take longer to render
                  </li>
                </ul>
              </div>
            }
          >
            <IoHelp className="hint-trigger" data-testid="depth-help-icon" />
          </Popover>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <InputNumber
            className="number-input"
            value={selectedDepth}
            onChange={onDepthChange}
            min={0}
            placeholder="Enter number"
            disabled={!selectedService}
            data-testid="depth-input"
          />
          <Button
            onClick={onReset}
            data-testid="reset-button"
            type="default"
            className="reset-button"
            size="small"
          >
            Reset
          </Button>
        </div>
      </div>
      <div className="selector-container">
        <div className="selector-label-container">
          <span className="selector-label">Search</span>
          <Popover
            placement="topLeft"
            trigger="click"
            content={
              <div>
                <ul className="hint-info">
                  <li>Search for nodes in the graph</li>
                  <li>Matching nodes will be highlighted</li>
                </ul>
              </div>
            }
          >
            <IoHelp className="hint-trigger" data-testid="search-help-icon" />
          </Popover>
        </div>
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <UiFindInput allowClear inputProps={{ className: 'search-input' }} />
            {uiFind && (
              <div className="search-match-count">
                {matchCount} match{matchCount !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
      {getAppEnvironment() === 'development' && (
        <div className="selector-container data-selector">
          <div className="selector-label-container">
            <span className="selector-label">Sample Dataset</span>
          </div>
          <SearchableSelect
            value={selectedSampleDatasetType}
            onChange={onSampleDatasetTypeChange}
            placeholder="Select Sample Dataset Type"
            className="select-sample-dataset-type-input"
            data-testid="sample-dataset-type-select"
          >
            {sampleDatasetTypes.map(type => (
              <Option key={type} value={type} data-testid={`sample-dataset-type-option-${type}`}>
                {type}
              </Option>
            ))}
          </SearchableSelect>
        </div>
      )}
    </div>
  );
};

export default DAGOptions;
