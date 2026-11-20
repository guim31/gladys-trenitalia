# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- A device per watched Italian station (Viaggiatreno data of RFI and
  Trenitalia), with an optional category of train (regional, Frecce,
  Intercity) and destination filter: minutes to the next and the following
  train that runs, delay of the next one, its time, number and destination, its
  platform, and the number of cancelled trains on the board.
- Actions to find, watch and stop watching a station, and a status.
- A _Next trains_ dashboard widget, coloured by delay, cancellations included.
- Scene triggers _Time to leave_ (1 to 30 minutes before a departure), _Train
  delayed_ (5 to 60 minutes) and _Train cancelled_, once per train.
- A _Get the next trains_ scene action, with a sentence ready to send.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-trenitalia/commits/main
