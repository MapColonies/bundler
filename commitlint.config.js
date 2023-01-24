module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", ["deps", "configurations", "core", "cli", "github", "common", "terminal-ui", "child-process"]],
  },
};
