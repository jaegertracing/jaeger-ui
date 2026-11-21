# RFC 0009 prototype

This folder is a runnable mock of the controls in [RFC 0009](../../0009-trace-span-search-and-filter.md): the one-line find, keep and hide cluster, the filter popover, both tree modes, and the `f=` URL codec. It renders the fixture `genaiTestTrace.json` from the application and is not linted, tested or shipped.

```bash
pnpm install          # once, at the repository root
docs/rfc/0009/prototype/run.sh
```

The page opens at http://localhost:5199. The yellow bar at the top holds controls that exist only in the prototype: the view (Timeline or GenAI, which changes the view default filter), the immediate-apply threshold (set it below 59, or open `?threshold=10`, to see the Apply button and the dashed pending chips), and the source of the active filter following RFC 0007.

What is simplified relative to the RFC: the `svcFilter` parameter is not read or written (a hidden service set is written as `f=h:service:…`), the root lock in remove mode is not enforced, and the up and down buttons move a cursor across the highlighted rows rather than paging the viewport as the application does.
