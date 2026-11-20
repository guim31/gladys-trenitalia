// -----------------------------------------------------------------------------
// The pure functions, on the real answers of Viaggiatreno: the departures of a
// station (gone trains dropped, Frecciarossa category read from its
// description, cancellations, platforms), the filters, the names, the date the
// API wants and the station pick.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiDate, searchText } from '../src/viaggiatreno.js';
import {
  aged,
  applyFilters,
  fold,
  groupOf,
  parseDepartures,
  pickStations,
  running,
  titleCase,
} from '../src/trains.js';
import { FIXTURE_TIME, recordedBoard } from './helpers/world.js';

const board = (code) => parseDepartures(recordedBoard(code), FIXTURE_TIME);

test('the date of a request: English, UTC, whatever the locale and the time zone', () => {
  assert.equal(apiDate(FIXTURE_TIME), 'Fri Nov 20 2026 21:52:00 GMT+0000');
  assert.equal(apiDate(Date.parse('2027-01-03T07:05:09Z')), 'Sun Jan 03 2027 07:05:09 GMT+0000');
  assert.equal(searchText('  Forlì  centro '), 'FORLI CENTRO');
});

test('Milano Centrale: the train that left is dropped, the others count down', () => {
  assert.equal(recordedBoard('S01700').length, 6);
  const departures = board('S01700');
  assert.equal(departures.length, 5, 'the REG 25288 to Chiasso has left');
  const [next] = departures;
  assert.deepEqual(
    [next.number, next.category, next.group, next.destination, next.minutes, next.late],
    ['REG 2986', 'REG', 'regional', 'Saronno', 3, 0],
  );
  assert.deepEqual([next.time, next.scheduled], ['22:55', '22:55']);
  assert.equal(next.platform, '8', 'the actual platform wins over the scheduled one (1)');
  assert.equal(departures[2].platform, '8', 'the scheduled platform when no other is known');
  assert.equal(next.expected, FIXTURE_TIME + 3 * 60000);
});

test('Roma Termini: Frecciarossa, Intercity, trains still in the station after their time', () => {
  const departures = board('S08409');
  assert.deepEqual(
    departures.map((d) => `${d.time} ${d.number} ${d.destination} ${d.minutes}`),
    [
      '22:52 REG 4538 Terni 0',
      '22:52 FR 9663 Napoli Centrale 0',
      '23:00 IC 764 Bolzano 8',
      '23:00 ICN 95063 Villa S.Giovanni 8',
      '23:56 ICN 789 Lecce 64',
    ],
  );
  const frecciarossa = departures[1];
  assert.deepEqual(
    [frecciarossa.category, frecciarossa.group, frecciarossa.late, frecciarossa.scheduled],
    ['FR', 'high_speed', 2, '22:50'],
  );
  // Still in the station 4 minutes after its time, without a reported delay:
  // 4 minutes late; the Frecciarossa reported 1 and is 2 past its 22:51.
  assert.deepEqual([departures[0].late, departures[0].scheduled], [4, '22:48']);
  // The IC 764 is diverted (provvedimento 3): it still runs.
  assert.equal(departures[2].cancelled, false);
  assert.equal(departures[3].platform, '');
});

test('Firenze: the three cancelled trains are on the board, none of them runs', () => {
  const departures = board('S06421');
  assert.equal(departures.length, 3);
  assert.ok(departures.every((d) => d.cancelled && d.late === 0));
  assert.deepEqual(running(departures), []);
  assert.equal(departures[2].destination, 'Montecatini Terme-Monsummano');
});

test('Torino Porta Nuova: its only train has left, an empty board', () => {
  assert.deepEqual(board('S00219'), []);
  assert.deepEqual(parseDepartures([], FIXTURE_TIME), []);
  assert.deepEqual(parseDepartures(null, FIXTURE_TIME), []);
});

test('the category and destination filters', () => {
  const departures = board('S08409');
  assert.deepEqual(
    applyFilters(departures, { category: 'high_speed' }).map((d) => d.number),
    ['FR 9663'],
  );
  assert.equal(applyFilters(departures, { category: 'intercity' }).length, 3);
  assert.deepEqual(
    applyFilters(departures, { destination: 'napoli' }).map((d) => d.number),
    ['FR 9663'],
  );
  assert.deepEqual(
    applyFilters(departures, { destination: 'villa s.' }).map((d) => d.number),
    ['ICN 95063'],
  );
  assert.equal(applyFilters(departures, {}).length, departures.length);
  assert.deepEqual(applyFilters(departures, { category: 'regional', destination: 'Lecce' }), []);
  assert.equal(groupOf('FA'), 'high_speed');
  assert.equal(groupOf('BUS'), '');
});

test('the countdowns age between two reads, the trains gone are dropped', () => {
  const later = aged(board('S01700'), FIXTURE_TIME + 5 * 60000);
  assert.equal(later[0].number, 'REG 2387');
  assert.equal(later[0].minutes, 8);
  assert.ok(!later.some((d) => d.number === 'REG 2986'), 'left 2 minutes ago');
});

test('names: title case, folded comparisons, the station of a typed name', () => {
  assert.equal(titleCase('REGGIO DI CALABRIA CENTRALE'), 'Reggio di Calabria Centrale');
  assert.equal(
    titleCase("MILANO TIBALDI UNIVERSITA' BOCCONI"),
    "Milano Tibaldi Universita' Bocconi",
  );
  assert.equal(titleCase('VILLA S.GIOVANNI'), 'Villa S.Giovanni');
  assert.equal(fold("FORLI'"), fold('Forli'));
  const stations = [
    { code: 'S01645', name: 'Milano Porta Garibaldi' },
    { code: 'S01647', name: 'Milano Porta Garibaldi Sotterranea' },
  ];
  assert.deepEqual(
    pickStations(stations, 'milano porta garibaldi').map((s) => s.code),
    ['S01645'],
  );
  assert.equal(pickStations(stations, 'milano porta').length, 2);
});

test('a train never seen leaving, long after its time, is a ghost: dropped', () => {
  const [terni] = recordedBoard('S08409').filter((record) => record.numeroTreno === 4538);
  const at = (minutes) =>
    parseDepartures([terni], Date.parse('2026-11-20T21:48:00Z') + minutes * 60000);
  assert.equal(at(10)[0].late, 10);
  assert.equal(at(10)[0].reportedLate, 0, 'inferred, not reported');
  assert.equal(at(15)[0].late, 15);
  assert.deepEqual(at(16), []);
  // With a reported delay, it stays.
  assert.equal(
    parseDepartures([{ ...terni, ritardo: 30 }], Date.parse('2026-11-20T22:30:00Z'))[0].late,
    42,
  );
});

test('a cancelled train keeps its time: it stays on the board until then', () => {
  const departures = board('S06421');
  const later = aged(departures, FIXTURE_TIME + 10 * 60000);
  assert.equal(later.length, 3);
  assert.equal(later[0].minutes, 5);
});
