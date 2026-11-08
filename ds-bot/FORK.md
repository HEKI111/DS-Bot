# This fork

A fork of [Fei2411/DS-Bot](https://github.com/Fei2411/DS-Bot) that keeps the Bot team,
with a different way of moving between it and DSH's own interface.

## Surface switch

Upstream writes the surface to `localStorage` (`ds-bot:surface`) and offers the only
control for it in **Settings → General → Mode**: a "Switch" button under "Classic Agent
mode". Nothing in the team interface offers the reverse trip, so a DSH the plugin took
over reads as "the app is gone" rather than "there are two surfaces".

This fork draws the choice as a two-option segmented control and keeps it on screen in
both surfaces:

- **Bot mode**: the team column's top row (`Sessions | Bots`), and the same pair stacked
  on the rail when the column is collapsed.
- **Agent mode**: DSH's own interface, where every Bot surface is withdrawn — the switch
  sits in the sidebar foot, beside Settings.

Picking moves the same state the settings button moves, so the saved choice, the
`plain` handling for a DSH Agent Session, and everything already built on
`surface.mode` are unchanged.

The control is a `radiogroup`, not a `tablist`: a tablist promises a tabpanel per tab,
and picking a surface swaps the whole application instead.

## Running it

```sh
cd ds-bot
npm ci
npm run harness   # once
npm run build     # src/client → client.js
npm test
```

`client.js` is generated and committed, so an install needs no build:

```sh
dsh plugin --profile web add github:HEKI111/DS-Bot#feat/surface-switch
```

## Differences from upstream

Only the surface switch: `src/client/surface-switch.js` (new), the top row and the
return control in `src/client/sidebar.js`, the style install in `src/client/index.js`,
the Chinese copy in `src/client/i18n.js`, and `test/surface-switch.test.js` (new).
