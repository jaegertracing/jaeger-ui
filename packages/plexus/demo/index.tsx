import * as React from 'react';
import { render } from 'react-dom';
// import LeDiv from './components/LeDiv';
import { LeDiv } from '../src';

// import { LeDiv } from '../build';

const root = document.getElementById('root');
console.log('a s')
render((
  <LeDiv />
), root);
