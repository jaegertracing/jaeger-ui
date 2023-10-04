.PHONY: changelog
changelog:
	./scripts/release-notes.py --exclude-dependabot --repo jaeger-ui --point-markdown-char '-'

.PHONY: draft-release
draft-release:
	./scripts/draft-release.py
