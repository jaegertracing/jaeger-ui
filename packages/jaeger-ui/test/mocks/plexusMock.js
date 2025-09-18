// Minimal mock for @jaegertracing/plexus used in tests
const React = require('react');

function Digraph(props) {
  return React.createElement(
    'div',
    { 'data-testid': 'mock-digraph', className: props.className },
    props.minimap ? React.createElement('div', { className: props.minimapClassName || 'u-miniMap' }) : null
  );
}
Digraph.propsFactories = {
  classNameIsSmall: () => ({ className: 'u-isSmall' }),
};

class LayoutManager {
  constructor() {}
  stopAndRelease() {}
}
const cacheAs = (key, val) => val;
cacheAs.makeScope = () => (key, val) => val;

module.exports = {
  Digraph,
  LayoutManager,
  cacheAs,
};
