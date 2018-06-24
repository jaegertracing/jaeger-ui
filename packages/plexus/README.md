# plexus

plexus is a React component for rendering directed graphs.

## Why?

To support directed graphs in Jaeger-UI, we surveyed the JavaScript libraries and utilities available for rendering directed graphs. The landscape is impressive, but we concluded the venerable [GraphViz](https://graphviz.gitlab.io/) ([alt](https://www.graphviz.org/)) is the right tool for us.

GraphViz is awesome, but the output formats don't fit our needs. We've elected to use GraphViz to generate the layouts (node positioning, edge routing) and React for rendering.

## viz.js

The excellent [viz.js](https://github.com/mdaines/viz.js) is used, in a WebWorker, to generate GraphViz as plain-text output which is then parsed and provided to a React component which does the rendering.
