// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { connect } from 'react-redux';

import TopNav from './TopNav';
import { ReduxState } from '../../types';
import { EmbeddedState } from '../../types/embedded';
import { trackPageView } from '../../utils/tracking';
import DocumentTitle from '../../utils/documentTitle';

import './Page.css';
import withRouteProps from '../../utils/withRouteProps';

type TProps = {
  children: React.ReactNode;
  embedded: EmbeddedState;
  pathname: string;
  search: string;
};

const { Header, Content } = Layout;

// export for tests
export const PageImpl: React.FC<TProps> = ({ children, embedded, pathname, search }) => {
  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);

  const contentCls = cx({ 'Page--content': true, 'Page--content--no-embedded': !embedded });

  return (
    <div>
      <DocumentTitle title="Jaeger UI" />
      <Layout>
        {!embedded && (
          <Header className="Page--topNav">
            <TopNav />
          </Header>
        )}
        <Content className={contentCls}>{children}</Content>
      </Layout>
    </div>
  );
};

// export for tests
export function mapStateToProps(state: ReduxState) {
  const { embedded } = state;
  const { pathname, search } = state.router.location;
  return { embedded, pathname, search };
}

export default connect(mapStateToProps)(PageImpl);
