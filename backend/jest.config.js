/**
 * Your package.json has "type": "module", so Jest needs to run in
 * experimental ESM mode. That's handled by the "test" script in
 * package.json (`node --experimental-vm-modules ...`) — you don't need to
 * set any extra flags yourself, just run `npm test`.
 */
export default {
  testEnvironment: "node",
  transform: {},
  setupFiles: ["<rootDir>/tests/setup/env.js"],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/config/**"],
};