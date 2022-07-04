# Cutting a Jaeger UI release

1. Determine the version for the release.
   - Follow [semver.org](https://semver.org) to determine the new version for Jaeger UI.
     - Review all changes since the last release to determine how, if at all, any externally facing APIs are impacted. This includes, but is not limited to, the UI config and URL routes such as deep-linking and configuring the embedded mode.
   - Preface the version with a "v", e.g. `v1.0.0`.
1. Create and merge, per approval, a PR which preps the release.
   1. The PR title should match the format "Prepare release vX.Y.Z".
   1. CHANGELOG.md
      - Change the version of the current release from "Next (unreleased)" to "vX.Y.Z (Month D, YYYY)" where "vX.Y.Z" is the semver for this release.
      - Make sure all relevant changes made since the last release are present and listed under the current release.
        - Tip: Run `node scripts/get-changelog.js` script that prints a dozen most recent commits in the chagelog format.
      - If necessary, add a note detailing any impact to externally facing APIs.
   1. Update `packages/jaeger-ui/package.json#version` to refer to the version being released.
1. Create a GitHub release.
   - Automated (requires [gh](https://cli.github.com/manual/installation)):
     - `python ./scripts/draft-release.py`
   - Manual:
     - The tag and release must refer to the commit created when the PR from the previous step was merged.
     - The tag name for the GitHub release should be the version for the release. It should include the "v", e.g. `v1.0.0`.
     - The title of the release match the format "Jaeger UI vX.Y.Z".
     - Copy the new CHANGELOG.md section into the release notes.
