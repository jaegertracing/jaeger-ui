# How to contribute to Jaeger UI

We'd love your help!

Jaeger is [Apache 2.0 licensed](LICENSE) and accepts contributions via GitHub pull requests. This document outlines some of the conventions on development workflow, commit message formatting, contact points and other resources to make it easier to get your contribution accepted.

We gratefully welcome improvements to documentation as well as to code.

# Certificate of origin

By contributing to this project you agree to the [Developer Certificate of Origin](https://developercertificate.org/) (DCO). This document was created by the Linux Kernel community and is a simple statement that you, as a contributor, have the legal right to make the contribution. See the [DCO](DCO) file for details.

## Making a change

_Before making any significant changes, please [open an issue](https://github.com/jaegertracing/jaeger-ui/issues)._ Discussing your proposed changes ahead of time will make the contribution process smooth for everyone.

Once we've discussed your changes and you've got your code ready, make sure that tests are passing and open your pull request. Your PR is most likely to be accepted if it:

* Includes tests for new functionality.
* References the original issue in description, e.g. "Resolves #123".
* Has a [good commit message](https://chris.beams.io/posts/git-commit/):
  * Separate subject from body with a blank line
  * Limit the subject line to 50 characters
  * Capitalize the subject line
  * Do not end the subject line with a period
  * Use the imperative mood in the subject line
  * Wrap the body at 72 characters
  * Use the body to explain _what_ and _why_ instead of _how_
* Each commit must be signed by the author ([see below](#sign-your-work)).

## License

By contributing your code, you agree to license your contribution under the terms of the [Apache License](LICENSE).

If you are adding a new file it should have a header like below.

```
// Copyright (c) 2017 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
```

## Sign your work

The sign-off is a simple line at the end of the explanation for the patch, which certifies that you wrote it or otherwise have the right to pass it on as an open-source patch. The rules are pretty simple: if you can certify the below (from [developercertificate.org](http://developercertificate.org/)):

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.
660 York Street, Suite 102,
San Francisco, CA 94110 USA

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

then you just add a line to every git commit message:

    Signed-off-by: Joe Smith <joe@gmail.com>

using your real name (sorry, no pseudonyms or anonymous contributions.)

You can add the sign off when creating the git commit via `git commit -s`.

If you want this to be automatic you can set up some aliases:

```
git config --add alias.amend "commit -s --amend"
git config --add alias.c "commit -s"
```

# Style guide

Prefer to use [flow](https://flow.org/) for new code.

We use [`prettier`](https://prettier.io/), an "opinionated" code formatter. It can be applied to both JavaScript and CSS source files via `yarn prettier`.

Then, most issues will be caught by the linter, which can be applied via `yarn eslint`.

Finally, we generally adhere to the [Airbnb Style Guide](https://github.com/airbnb/javascript), with exceptions as noted in our `.eslintrc`.

# Cutting a Jaeger UI release

1. Determine the version for the release.
   * Follow [semver.org](https://semver.org) to determine the new version for Jaeger UI.
     * Review all changes since the last release to determine how, if at all, any externally facing APIs are impacted. This includes, but is not limited to, the UI config and URL routes such as deep-linking and configuring the embedded mode.
   * Preface the version with a "v", e.g. `v1.0.0`.
1. Create and merge, per approval, a PR which preps the release.
   1. The PR title should match the format "Preparing release vX.Y.Z".
   1. CHANGELOG.md
      * Change the version of the current release from "Next (unreleased)" to "vX.Y.Z (Month D, YYYY)" where "vX.Y.Z" is the semver for this release.
      * Make sure all relevant changes made since the last release are present and listed under the current release. [`scripts/get-changelog.js`](https://github.com/jaegertracing/jaeger-ui/blob/52780c897f21131472de9b81c96ebd63853917ee/scripts/get-changelog.js) might be useful.
      * If necessary, add a note detailing any impact to externally facing APIs.
   1. Update `packages/jaeger-ui/package.json#version` to refer to the version being released.
1. Create a GitHub release.
   * The tag and release must refer to the commit created when the PR from the previous step was merged.
   * The tag name for the GitHub release should be the version for the release. It should include the "v", e.g. `v1.0.0`.
   * The title of the release match the format "Jaeger UI vX.Y.Z".
   * Copy the new CHANGELOG.md section into the release notes.
