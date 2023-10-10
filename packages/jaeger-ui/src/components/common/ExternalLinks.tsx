// Copyright (c) 2019 The Jaeger Authors.
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

import { Dropdown, Menu, MenuProps } from 'antd';
import * as React from 'react';
import { Link } from '../../types/trace';
import NewWindowIcon from './NewWindowIcon';

type ExternalLinksProps = {
  links: Link[];
};

const LinkValue = (props: {
  href: string;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <a
    href={props.href}
    title={props.title}
    target="_blank"
    rel="noopener noreferrer"
    className={props.className}
  >
    {props.children} <NewWindowIcon />
  </a>
);

// export for testing
export const linkValueList = (links: Link[]) => {
  const menuItems: MenuProps['items'] = links.map(({ text, url }, index) => ({
    label: <LinkValue href={url}>{text}</LinkValue>,
    key: `${url}-${index}`,
  }));

  return [{ label: <Menu items={menuItems} />, key: 'external-links' }];
};

export default function ExternalLinks(props: ExternalLinksProps) {
  const { links } = props;
  if (links.length === 1) {
    return <LinkValue href={links[0].url} title={links[0].text} className="TracePageHeader--back" />;
  }
  return (
    <Dropdown menu={{ items: linkValueList(links) }} placement="bottomRight" trigger={['click']}>
      <a className="TracePageHeader--back">
        <NewWindowIcon isLarge />
      </a>
    </Dropdown>
  );
}
