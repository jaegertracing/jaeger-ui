module.exports = {
  // Let ESLint know about constants injected by the build system.
  // These aren't technically globals (in that they are replaced by literals at build time),
  // but from a linter perspective, they are globals and so need to be explicitly listed.
  // https://vitejs.dev/config/shared-options.html#define
  globals: {
    __REACT_APP_GA_DEBUG__: false,
    __REACT_APP_VSN_STATE__: false,
    __APP_ENVIRONMENT__: false,
  },
};
