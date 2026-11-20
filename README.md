# Trenitalia for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) external integration for **Italy**: the next
trains of your stations (regional trains, Frecciarossa, Intercity…), in real time, with delays,
platforms and cancellations, from [Viaggiatreno](http://www.viaggiatreno.it), the public real-time
board of RFI and Trenitalia. No account, no key.

> **Developed from outside Italy: feedback welcome.** The integration is built and tested on real
> Viaggiatreno answers (recorded on a Friday evening at Milano Centrale, Roma Termini, Firenze Santa
> Maria Novella and Torino Porta Nuova) and its container was run against the live service; it has
> not yet run in a Gladys installation. Please report what works and what does not in the
> [issues](https://github.com/guim31/gladys-trenitalia/issues) or on the Gladys forum.

## What it does

- **A device per watched station**, optionally filtered by category of train (regional, Frecce,
  Intercity) and by destination: minutes to the next train that runs and to the following one,
  delay of the next one, its time, number and destination, its platform, and the number of
  cancelled trains on the board.
- **A dashboard widget**: the next departures of a station, coloured by delay, cancellations
  included.
- **Three scene triggers**: time to leave, train delayed, train cancelled, each once per train.
- **A scene action**: the next trains of a station, with a sentence ready for a message or a
  speaker.

Texts and documentation in English, French, German and Spanish: [en](docs/en.md),
[fr](docs/fr.md), [de](docs/de.md), [es](docs/es.md).

## Requirements

- Gladys Assistant 5.3.0 or later.
- Internet access from the Gladys host.

## Installation

1. In Gladys, open **Integrations → Install from GitHub**.
2. Paste `https://github.com/guim31/gladys-trenitalia` and install.
3. In the **Configuration** tab, use **Find a station** and **Watch a station**, then create the
   device in the **Discover** tab.

## How it works

Every minute (or two, or five), for the created devices only, the integration reads the departures
of each watched station (`partenze/<code>/<date>`, the trains of the next hour or two). The station
search (`cercaStazione`, and `regione` + `dettaglioStazione` for a code) runs only when you search or
add a station. Viaggiatreno is unofficial and undocumented; its CDN answers 403 without a
browser-like User-Agent and 400 to a date not written in English (`Fri Nov 20 2026 21:52:00
GMT+0000`): the integration sends both right. It publishes no quota: one request per station per
refresh, one minute at the shortest, for personal use. Only `/data/watch.json` is written: the
watched stations and their filters.

## Limits

- Trenitalia and the regional operators shown by Viaggiatreno; Italo (NTV) trains are not covered.
- Viaggiatreno can change without notice: the integration may break until an update.
- The delay of a train is known once it has left its origin; partial cancellations and diversions
  show as running.
- Up to 10 watched stations. Feature names are set when the device is created.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests run against the SDK's fake Gladys and real Viaggiatreno answers recorded in
`test/fixtures/viaggiatreno`; they never touch the network. See [`CLAUDE.md`](CLAUDE.md) for the
project rules.

## Credits

- Data: [Viaggiatreno](http://www.viaggiatreno.it), RFI and Trenitalia.
- Cover: the Trenitalia logo from
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Trenitalia_logo.svg) (public domain), with the
  Trenitalia green and red.
- Inspired by the Home Assistant [Viaggiatreno](https://www.home-assistant.io/integrations/viaggiatreno/)
  integration (Apache 2.0), and modelled on the `gladys-irish-rail` integration.

Not affiliated with Trenitalia, RFI or the Ferrovie dello Stato Italiane group. The logo is a
trademark of its owner.

## License

Apache-2.0
