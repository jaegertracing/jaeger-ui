.PHONY: changelog
changelog:
	wget https://raw.githubusercontent.com/jaegertracing/jaeger/main/scripts/release-notes.py -O ./scripts/release-notes.py -q
	chmod 755 ./scripts/release-notes.py
	./scripts/release-notes.py --exclude-dependabot --repo jaeger-ui

.PHONY: draft-release
draft-release:
	./scripts/draft-release.py
