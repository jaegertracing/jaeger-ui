# Cutting a Jaeger UI release

1. Create and merge, per approval, a PR which preps the release ([example](https://github.com/jaegertracing/jaeger-ui/pull/1767)).
   1. The PR title should match the format "Prepare release vX.Y.Z".
   2. CHANGELOG.md
      - Change the version of the current release from "Next (unreleased)" to "vX.Y.Z (Month D, YYYY)",
        where "vX.Y.Z" is the [semver](https://semver.org) for this release.
      - Run `make changelog` to list all changes since the last release.
      - Review all changes to determine how, if at all, any externally facing APIs are impacted.
        This includes, but is not limited to, the UI config and URL routes such as deep-linking
        and configuring the embedded mode.
      - If necessary, add a note detailing any impact to externally facing APIs.
   3. Update `packages/jaeger-ui/package.json#version` to refer to the version being released.
2. Create a GitHub release.
   - Automated (requires [gh](https://cli.github.com/manual/installation)):
     - `make draft-release`
   - Manual:
     - The tag and release must refer to the commit created when the PR from the previous step was merged.
     - The tag name for the GitHub release should be the version for the release. It should include the "v", e.g. `v1.0.0`.
     - The title of the release match the format "Jaeger UI vX.Y.Z".
     - Copy the new CHANGELOG.md section into the release notes.
