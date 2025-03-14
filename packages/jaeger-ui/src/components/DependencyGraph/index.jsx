// Copyright (c) 2017 Uber Technologies, Inc.
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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import memoizeOne from 'memoize-one';
import debounce from 'lodash/debounce';

import DAG from './DAG';
import DAGOptions from './DAGOptions';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { FALLBACK_DAG_MAX_NUM_SERVICES } from '../../constants';
import { nodesPropTypes, linksPropTypes } from '../../propTypes/dependencies';
import { getConfigValue } from '../../utils/config/get-config';

import './index.css';
import withRouteProps from '../../utils/withRouteProps';

// export for tests
export const GRAPH_TYPES = {
  DAG: { type: 'DAG', name: 'DAG' },
};

const dagMaxNumServices = getConfigValue('dependencies.dagMaxNumServices') || FALLBACK_DAG_MAX_NUM_SERVICES;

// export for tests
export class DependencyGraphPageImpl extends Component {
  static propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    dependencies: PropTypes.any.isRequired,
    fetchDependencies: PropTypes.func.isRequired,
    nodes: nodesPropTypes,
    links: linksPropTypes,
    loading: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    error: PropTypes.object,
  };

  static defaultProps = {
    nodes: null,
    links: null,
    error: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedService: null,
      selectedLayout: props.dependencies.length > dagMaxNumServices ? 'sfdp' : 'dot',
      selectedDepth: 5,
      debouncedDepth: 5,
    };
  }

  componentDidMount() {
    this.props.fetchDependencies();
  }

  handleServiceSelect = service => {
    this.setState({ selectedService: service });
  };

  handleLayoutSelect = layout => {
    this.setState({ selectedLayout: layout });
  };

  handleDepthChange = value => {
    if (value === null || value === undefined) {
      return;
    }
    const numValue = Number(value);
    if (Number.isInteger(numValue) && numValue >= 0) {
      this.setState({ selectedDepth: numValue });
      this.debouncedDepthChange(numValue);
    }
  };

  debouncedDepthChange = debounce(value => {
    this.setState({ debouncedDepth: value });
  }, 1000);

  handleReset = () => {
    this.setState({
      selectedService: null,
      selectedDepth: 5,
      debouncedDepth: 5,
    });
  };

  render() {
    const { nodes, links, error, loading, dependencies } = this.props;
    const { selectedService, selectedLayout, selectedDepth, debouncedDepth } = this.state;

    if (loading) {
      return <LoadingIndicator className="u-mt-vast" centered />;
    }
    if (error) {
      return <ErrorMessage className="ub-m3" error={error} />;
    }

    if (!nodes || !links) {
      return (
        <div className="u-simple-card ub-m3">
          No service dependencies found.{' '}
          <a
            href="https://www.jaegertracing.io/docs/latest/faq/#why-is-the-dependencies-page-empty"
            rel="noopener noreferrer"
            target="_blank"
          >
            See FAQ
          </a>
          .
        </div>
      );
    }

    const isHierarchicalDisabled = dependencies.length > dagMaxNumServices;

    return (
      <div>
        <div className="ub-m3">
          <DAGOptions
            dependencies={dependencies}
            onServiceSelect={this.handleServiceSelect}
            onLayoutSelect={this.handleLayoutSelect}
            onDepthChange={this.handleDepthChange}
            selectedService={selectedService}
            selectedLayout={selectedLayout}
            selectedDepth={selectedDepth}
            onReset={this.handleReset}
            isHierarchicalDisabled={isHierarchicalDisabled}
          />
        </div>
        <div className="DependencyGraph--graphWrapper">
          <DAG
            serviceCalls={dependencies}
            selectedLayout={selectedLayout}
            selectedDepth={debouncedDepth}
            selectedService={selectedService}
          />
        </div>
      </div>
    );
  }
}

const formatDependenciesAsNodesAndLinks = memoizeOne(dependencies => {
  const data = dependencies.reduce(
    (response, link) => {
      const { nodeMap } = response;
      let { links } = response;

      // add both the parent and child to the node map, or increment their
      // call count.
      nodeMap[link.parent] = nodeMap[link.parent] ? nodeMap[link.parent] + link.callCount : link.callCount;
      nodeMap[link.child] = nodeMap[link.child]
        ? response.nodeMap[link.child] + link.callCount
        : link.callCount;

      // filter out self-dependent
      if (link.parent !== link.child) {
        links = links.concat([
          {
            source: link.parent,
            target: link.child,
            callCount: link.callCount,
            value: Math.max(Math.sqrt(link.callCount / 10000), 1),
            target_node_size: Math.max(Math.log(nodeMap[link.child] / 1000), 3),
          },
        ]);
      }

      return { nodeMap, links };
    },
    { nodeMap: {}, links: [] }
  );

  data.nodes = Object.keys(data.nodeMap).map(id => ({
    callCount: data.nodeMap[id],
    radius: Math.max(Math.log(data.nodeMap[id] / 1000), 3),
    orphan: data.links.findIndex(link => id === link.source || id === link.target) === -1,
    id,
  }));

  const { nodes, links } = data;

  return { nodes, links };
});

// export for tests
export function mapStateToProps(state) {
  const { dependencies, error, loading } = state.dependencies;
  let links;
  let nodes;
  if (dependencies && dependencies.length > 0) {
    const formatted = formatDependenciesAsNodesAndLinks(dependencies);
    links = formatted.links;
    nodes = formatted.nodes;
  }
  return { loading, error, nodes, links, dependencies };
}

// export for tests
export function mapDispatchToProps(dispatch) {
  const { fetchDependencies } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchDependencies };
}

export default withRouteProps(connect(mapStateToProps, mapDispatchToProps)(DependencyGraphPageImpl));
