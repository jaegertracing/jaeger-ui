// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';

import TopNav from './TopNav';
import { JaegerAssistantDock } from './JaegerAssistantPanel';
import { useJaegerAssistantOptional } from './JaegerAssistantContext';
import { isJaegerAssistantConfigured } from './jaegerAgUi';
import { ReduxState } from '../../types';
import { EmbeddedState } from '../../types/embedded';
import { trackPageView } from '../../utils/tracking';
import DocumentTitle from '../../utils/documentTitle';

import './Page.css';
import withRouteProps from '../../utils/withRouteProps';

type TProps = {
  children: React.ReactNode;
  embedded: EmbeddedState;
};

const { Header, Content } = Layout;

// export for tests
export const PageImpl: React.FC<TProps> = ({ children, embedded }) => {
  const { pathname, search } = useLocation();
  const assistant = useJaegerAssistantOptional();
  const assistantPanelOpen = Boolean(assistant?.panelOpen);
  const assistantEnvOn = !embedded && isJaegerAssistantConfigured();
  const assistantDockOpen = assistantEnvOn && assistantPanelOpen;

  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);

  const contentCls = cx({
    'Page--content': true,
    'Page--content--no-embedded': !embedded,
  });

  return (
    <div>
      <DocumentTitle title="Jaeger UI" />
      <Layout>
        {!embedded && (
          <Header className="Page--topNav">
            <TopNav />
          </Header>
        )}
        <Content className={contentCls}>
          {assistantEnvOn ? (
            <div className={cx('Page--assistantShell', assistantDockOpen && 'Page--assistantShell--open')}>
              <div className="Page--assistantMain">{children}</div>
              <JaegerAssistantDock />
            </div>
          ) : (
            children
          )}
        </Content>
      </Layout>
    </div>
  );
};

// export for tests
export function mapStateToProps(state: ReduxState) {
  const { embedded } = state;
  return { embedded };
}

export default connect(mapStateToProps)(withRouteProps(PageImpl));
