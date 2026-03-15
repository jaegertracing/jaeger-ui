# Security Policy

Jaeger UI follows the Jaeger project's coordinated vulnerability disclosure process. This file
summarizes how to report a vulnerability in this repository and what to expect after disclosure.
For broader project guidance, see the upstream Jaeger policy:
https://github.com/jaegertracing/jaeger/blob/main/SECURITY.md

## Supported Versions

Jaeger UI is maintained together with the Jaeger project. Security fixes are prioritized for the
current development line and are normally released in the next available Jaeger release. When a
vulnerability is severe enough, maintainers may prepare an out-of-band security release or patch.

## Reporting a Vulnerability

Please do not open a public issue for a suspected security vulnerability.

The preferred way to disclose a vulnerability is to use the GitHub Security Advisory form for the
Jaeger project:

https://github.com/jaegertracing/jaeger/security/advisories

That channel allows private discussion with maintainers and is the fastest way to start a
coordinated disclosure.

If you cannot use GitHub Security Advisories, send the report to
jaeger-tracing@googlegroups.com and include `SECURITY` in the subject line. You can also review
the project guidance at:

https://www.jaegertracing.io/report-security-issue/

Include enough detail for maintainers to reproduce and validate the vulnerability:

- affected package, file, or feature
- impact and expected attack scenario
- reproduction steps, proof of concept, or logs
- version, commit, or deployment details
- any proposed mitigation or fix

## Disclosure Process and Timelines

Maintainers aim to acknowledge a vulnerability report within 3 business days. After triage, we
work with the reporter on validation, impact assessment, remediation, and coordinated disclosure.

If the report is accepted as a vulnerability, maintainers aim to provide a status update within 7
days and publish a fix or mitigation timeline as soon as the impact is understood. Disclosure
happens after a fix or mitigation is available, or earlier if active exploitation or user safety
requires it.

## Public Disclosure

Please keep vulnerability details private until maintainers confirm that public disclosure is safe.
This reduces risk for Jaeger UI users while a fix is being prepared and released.
