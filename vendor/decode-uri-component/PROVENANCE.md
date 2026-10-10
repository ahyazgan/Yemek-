# CommonJS compatibility build

Upstream: [decode-uri-component 0.5.0](https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0), downloaded from npm on 2026-10-10.
Upstream tarball SHA-1: 4592fa1e1d640ec5e2760e2e168ad2ab5f2c9da1.

The original MIT license is included. The sole source change replaces `export default function` with `module.exports = function`. This preserves query-string 7's synchronous CommonJS function contract while using the upstream fix for GHSA-vcc3-ghjq-m6fr. The local version suffix identifies this compatibility build, not an upstream release.

Only query-string's dependency is overridden. Remove the override once Expo Router ships a compatible fixed dependency. Do not format upstream source. Validate with npm ci, npm test, Expo export and malformed URL browser tests after dependency changes.
