const base = require('../../../../../jest.config.base');

module.exports = {
  ...base,
  rootDir: '../../../.',
  displayName: 'core',
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
};
