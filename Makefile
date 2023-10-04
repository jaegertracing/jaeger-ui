.PHONY: changelog
changelog:
	wget https://github.com/jaegertracing/jaeger/blob/main/scripts/release-notes.py -O ./scripts/release-notes.py -q
	./scripts/release-notes.py --exclude-dependabot --repo jaeger-ui --point-markdown-char '-'

.PHONY: draft-release
draft-release:
	./scripts/draft-release.py
