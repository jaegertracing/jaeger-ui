// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Menu } from 'semantic-ui-react';

import './DependencyGraph.css';
import * as jaegerApiActions from '../../actions/jaeger-api';
import {
  formatDependenciesAsNodesAndLinks,
} from '../../selectors/dependencies';
import NotFound from '../App/NotFound';
import { nodesPropTypes, linksPropTypes } from '../../propTypes/dependencies';

import DependencyForceGraph from './DependencyForceGraph';
import DAG from './DAG';

export default class DependencyGraphPage extends Component {
  static get propTypes() {
    return {
      dependencies: PropTypes.any,
      fetchDependencies: PropTypes.func.isRequired,
      nodes: nodesPropTypes,
      links: linksPropTypes,
      loading: PropTypes.bool,
      error: PropTypes.object,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      graphType: 'FORCE_DIRECTED',
    };
  }
  componentDidMount() {
    this.props.fetchDependencies();
  }

  handleGraphTypeChange(graphType) {
    this.setState({ graphType });
  }

  render() {
    const { nodes, links, error, dependencies, loading } = this.props;
    const { graphType } = this.state;
    const serviceCalls = dependencies.toJS();
    if (loading) {
      return (
        <div className="m1">
          <div className="ui active centered inline loader" />
        </div>
      );
    }
    if (error) {
      return <NotFound error={error} />;
    }

    if (!nodes || !links) {
      return <section />;
    }

    const GRAPH_TYPE_OPTIONS = [
      { type: 'FORCE_DIRECTED', name: 'Force Directed Graph' },
    ];

    if (serviceCalls.length <= 100) {
      GRAPH_TYPE_OPTIONS.push({ type: 'DAG', name: 'DAG' });
    }
    return (
      <div className="my2">
        <Menu tabular>
          {GRAPH_TYPE_OPTIONS.map(option => (
            <Menu.Item
              name={option.name}
              active={graphType === option.type}
              onClick={() => this.handleGraphTypeChange(option.type)}
            />
          ))}
        </Menu>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 15,
            left: 15,
            top: 120,
            overflow: 'hidden',
            background: 'whitesmoke',
          }}
        >
          {graphType === 'FORCE_DIRECTED' &&
            <DependencyForceGraph nodes={nodes} links={links} />}
          {graphType === 'DAG' && <DAG serviceCalls={serviceCalls} />}
        </div>
      </div>
    );
  }
}

// export connected component separately
function mapStateToProps(state) {
  const dependencies = state.dependencies.get('dependencies');
  let nodes;
  let links;
  if (dependencies && dependencies.size > 0) {
    const nodesAndLinks = formatDependenciesAsNodesAndLinks({ dependencies });
    nodes = nodesAndLinks.nodes;
    links = nodesAndLinks.links;
  }
  const error = state.dependencies.get('error');
  const loading = state.dependencies.get('loading');

  return { loading, error, nodes, links, dependencies };
}

function mapDispatchToProps(dispatch) {
  const { fetchDependencies } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchDependencies };
}

export const ConnectedDependencyGraphPage = connect(
  mapStateToProps,
  mapDispatchToProps
)(DependencyGraphPage);
