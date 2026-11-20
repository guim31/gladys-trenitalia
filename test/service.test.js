// -----------------------------------------------------------------------------
// The integration end to end, against the SDK's fake Gladys and a fake
// Viaggiatreno answering the real recorded boards: the actions (green on
// success, red on failure), the devices and their states, a board of cancelled
// trains, an empty board, Viaggiatreno down or refusing, the triggers, the
// scene action, the widget, the restoration after /data is lost, the
// container's own timer and the quiet logs.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { NO_DEPARTURE_MINUTES } from '../src/devices.js';
import { TRIGGERS } from '../src/service.js';
import { stageEverything } from './helpers/scenario.js';
import {
  action,
  captureLogs,
  changeTrain,
  create,
  createFetch,
  createWorld,
  lastState,
} from './helpers/world.js';

async function watched(t, station, name, options = {}) {
  const world = await createWorld(options);
  t.after(() => world.app.stop());
  await action(world, 'add_station', { station, ...(options.fields ?? {}) });
  const device = await create(world, name);
  return { world, device };
}
const milano = (t, options) => watched(t, 'Milano Centrale', 'Milano Centrale', options);

test('search: the stations starting with a text, with their code', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const message = await action(world, 'search_stations', { query: 'firenze' });
  assert.match(message.en, /6 station\(s\) found/);
  assert.match(message.fr, /• Firenze Santa Maria Novella \[S06421\]/);
  const many = await action(world, 'search_stations', { query: 'Milano' });
  assert.match(many.en, /26 station\(s\) found/);
  assert.equal(many.en.split('\n').filter((line) => line.startsWith('•')).length, 10);
  const failed = await world.fake.action('search_stations', { query: 'Atlantide' });
  assert.equal(failed.success, false);
  assert.match(failed.error.fr, /Aucune gare ne commence par « Atlantide »/);
  const empty = await world.fake.action('search_stations', { query: '  ' });
  assert.equal(empty.success, false);
  assert.match(empty.error.de, /Gib den Anfang/);
});

test('add: by name, by code, with accents; homonyms, unknown names and duplicates', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const added = await action(world, 'add_station', { station: 'milano centrale' });
  assert.match(added.fr, /Milano Centrale ajoutée/);
  const filtered = await action(world, 'add_station', {
    station: 'S08409',
    category: 'high_speed',
    destination: 'Napoli',
  });
  assert.match(filtered.en, /Roma Termini \(Frecce · → Napoli\) added/);
  const accented = await action(world, 'add_station', { station: 'Forlì' });
  assert.match(accented.en, /Forli' added/);
  assert.equal(world.fake.discoveredDevices.length, 3);

  const twice = await world.fake.action('add_station', { station: 'S01700' });
  assert.equal(twice.success, true);
  assert.match(twice.data.message.en, /already watched/);

  const homonyms = await world.fake.action('add_station', { station: 'Torino' });
  assert.equal(homonyms.success, false);
  assert.match(homonyms.error.fr, /Plusieurs gares correspondent/);
  assert.match(homonyms.error.fr, /• Torino Porta Nuova \[S00219\]/);

  const unknown = await world.fake.action('add_station', { station: 'Atlantide' });
  assert.equal(unknown.success, false);
  assert.match(unknown.error.de, /Kein italienischer Bahnhof passt zu „Atlantide“/);
  const unknownCode = await world.fake.action('add_station', { station: 'S99999' });
  assert.equal(unknownCode.success, false);
  assert.match(unknownCode.error.es, /Ninguna estación italiana coincide con «S99999»/);

  world.network.fail = new Error('ECONNREFUSED');
  const down = await world.fake.action('add_station', { station: 'Roma' });
  assert.equal(down.success, false);
  assert.match(down.error.fr, /Viaggiatreno est illisible \(viaggiatreno\.it: unreachable\)/);
});

test('a created station publishes its next trains, delay, platform and cancellations', async (t) => {
  const { world, device } = await milano(t);
  assert.equal(device.should_poll, false);
  assert.equal(device.poll_frequency, undefined);
  assert.equal(lastState(world, device, 'next'), 3);
  assert.equal(lastState(world, device, 'following'), 13);
  assert.equal(lastState(world, device, 'delay'), 0);
  assert.equal(lastState(world, device, 'destination'), '22:55 REG 2986 → Saronno');
  assert.equal(lastState(world, device, 'platform'), '8');
  assert.equal(lastState(world, device, 'cancelled'), 0);
  assert.deepEqual(world.fake.widgetRefreshes, ['departures']);
  // Two minutes later without a new read: the countdowns go on.
  world.network.fail = 503;
  world.clock.advance(120000);
  await world.service.refresh();
  assert.equal(lastState(world, device, 'next'), 1);
  assert.equal(lastState(world, device, 'destination'), '22:55 REG 2986 → Saronno');
});

test('the filters of a watch: Frecce to Napoli, Intercity', async (t) => {
  const world = await createWorld({ config: { language: 'en' } });
  t.after(() => world.app.stop());
  await action(world, 'add_station', {
    station: 'Roma Termini',
    category: 'high_speed',
    destination: 'napoli',
  });
  await action(world, 'add_station', { station: 'S08409', category: 'intercity' });
  const frecce = await create(world, 'Frecce');
  const intercity = await create(world, 'Intercity');
  assert.equal(lastState(world, frecce, 'destination'), '22:51 FR 9663 → Napoli Centrale');
  assert.equal(lastState(world, frecce, 'next'), 0);
  assert.equal(lastState(world, frecce, 'delay'), 1);
  assert.equal(lastState(world, frecce, 'platform'), '3');
  assert.equal(lastState(world, frecce, 'following'), NO_DEPARTURE_MINUTES);
  assert.equal(lastState(world, intercity, 'next'), 8);
  assert.equal(lastState(world, intercity, 'following'), 8);
  assert.equal(lastState(world, intercity, 'platform'), '2');
  // Two watches of one station: one request per refresh.
  const before = world.network.boardRequests().length;
  await world.service.refresh();
  assert.equal(world.network.boardRequests().length - before, 1);
});

test('a board of cancelled trains: no next train, three cancellations', async (t) => {
  const { world, device } = await watched(t, 'S06421', 'Firenze');
  assert.equal(lastState(world, device, 'next'), NO_DEPARTURE_MINUTES);
  assert.equal(lastState(world, device, 'cancelled'), 3);
  assert.equal(lastState(world, device, 'destination'), 'Aucun train annoncé');
  assert.equal(lastState(world, device, 'platform'), '–');
  const result = await world.fake.sceneAction('get_next_departures', {
    station: device.external_id,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.outputs.cancelled, 3);
  assert.match(result.data.outputs.sentence, /Aucun train annoncé au départ de Firenze/);
  const widget = await world.fake.widgetGet('departures', {
    settings: { station: device.external_id },
    language: 'fr',
  });
  assert.deepEqual(validateWidgetContent(widget.data.content), []);
  const rows = widget.data.content.components.at(-1).items;
  assert.deepEqual(rows[0], {
    label: '23:07 → Livorno Centrale',
    value: 'REG 18339 · supprimé',
    color: 'danger',
  });
  const hidden = await world.fake.widgetGet('departures', {
    settings: { station: device.external_id, show_cancelled: false },
    language: 'fr',
  });
  assert.equal(hidden.data.content.components[1].text, 'Aucun train annoncé');
});

test('an empty board: no train announced', async (t) => {
  const { world, device } = await watched(t, 'Torino Porta Nuova', 'Torino');
  assert.equal(lastState(world, device, 'next'), NO_DEPARTURE_MINUTES);
  assert.equal(lastState(world, device, 'following'), NO_DEPARTURE_MINUTES);
  assert.equal(lastState(world, device, 'delay'), 0);
  assert.equal(lastState(world, device, 'cancelled'), 0);
});

test('Viaggiatreno down: one warning, the status says it in four languages, then it comes back', async (t) => {
  const { world } = await milano(t);
  const logs = captureLogs(t, 'info');
  world.network.fail = new Error('ETIMEDOUT');
  for (let i = 0; i < 3; i += 1) {
    world.clock.advance(60000);
    await world.service.refresh();
  }
  const status = world.fake.connectionStatus;
  assert.equal(status.connected, false);
  assert.deepEqual(Object.keys(status.message).sort(), ['de', 'en', 'es', 'fr']);
  assert.match(status.message.en, /Viaggiatreno cannot be read \(viaggiatreno\.it: unreachable\)/);
  assert.equal(logs.filter((line) => line.level === 'warn').length, 1);
  world.network.fail = null;
  world.clock.advance(60000);
  await world.service.refresh();
  assert.equal(world.fake.connectionStatus.connected, true);
  assert.equal(logs.filter((line) => /reachable again/.test(line.text)).length, 1);
  const answer = await action(world, 'status');
  assert.match(answer.fr, /Milano Centrale \[S01700\] — appareil créé/);
});

test('refused by the CDN (403) or a maintenance page: an error, not an empty board', async (t) => {
  const { world, device } = await milano(t);
  world.network.fail = 403;
  world.clock.advance(60000);
  await world.service.refresh();
  assert.equal(world.fake.connectionStatus.connected, false);
  assert.match(world.fake.connectionStatus.message.en, /HTTP 403 \(refused by its CDN\)/);
  world.network.fail = null;
  world.service.api.fetch = async () => new Response('<html>manutenzione</html>');
  world.service.lastError = null;
  world.clock.advance(60000);
  await world.service.refresh();
  assert.match(world.fake.connectionStatus.message.en, /unexpected answer/);
  assert.equal(lastState(world, device, 'next'), 1, 'the last board, aged');
});

test('every request carries the browser-like User-Agent and a well-formed date', async (t) => {
  const { world } = await milano(t);
  // The fake answers 403 without the agent and 400 to another date format.
  assert.equal(world.fake.connectionStatus.connected, true);
  const [request] = world.network.boardRequests();
  assert.match(request.url, /partenze\/S01700\/Fri%20Nov%2020%202026%2021%3A52%3A00%20GMT%2B0000$/);
});

test('triggers: silent at the first read, then each threshold once per train', async (t) => {
  const world = await createWorld({ config: { language: 'en' } });
  t.after(() => world.app.stop());
  const { station, events } = await stageEverything(world);
  const delayed = events.filter((event) => event.key === TRIGGERS.DELAYED);
  assert.deepEqual(
    delayed.map((event) => [event.data.train_number, event.data.threshold]),
    [
      ['REG 2387', '5'],
      ['REG 2387', '10'],
    ],
  );
  assert.equal(delayed[0].data.station, station.external_id);
  assert.equal(delayed[0].data.delay, 12);
  assert.equal(delayed[0].data.category, 'REG');
  assert.equal(delayed[0].data.destination, 'Voghera');
  assert.equal(delayed[0].data.platform, '17');
  assert.equal(delayed[0].data.expected_time, '23:17');
  assert.equal(delayed[0].data.scheduled_time, '23:05');
  const soon = events.filter((event) => event.key === TRIGGERS.SOON);
  assert.deepEqual(
    soon.map((event) => [event.data.train_number, event.data.threshold]),
    [['REG 2986', '2']],
  );
  const cancelled = events.filter((event) => event.key === TRIGGERS.CANCELLED);
  assert.deepEqual(
    cancelled.map((event) => [event.data.train_number, event.data.destination]),
    [['REG 24886', 'Lecco']],
  );
  // The same board again: nothing new.
  const count = world.fake.sceneEvents.length;
  world.clock.advance(1000);
  await world.service.refresh();
  assert.equal(world.fake.sceneEvents.length, count);
});

test('a cancelled train never says "time to leave", and the cancellation fires once', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await stageEverything(world);
  const before = world.fake.sceneEvents.length;
  // 25 minutes later the cancelled REG 24886 would be due in 4 minutes.
  world.clock.advance(25 * 60000);
  await world.service.refresh();
  const events = world.fake.sceneEvents.slice(before);
  assert.ok(!events.some((event) => event.data.train_number === 'REG 24886'));
});

test('the scene action: numbers and a sentence; a station no longer watched fails in red', async (t) => {
  const { world, device } = await milano(t, { config: { language: 'en' } });
  const result = await world.fake.sceneAction('get_next_departures', {
    station: device.external_id,
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.outputs, {
    sentence:
      'REG 2986 to Saronno from Milano Centrale: in 3 min, platform 8, then REG 2387 to Voghera in 13 min.',
    station_name: 'Milano Centrale',
    destination: 'Saronno',
    category: 'REG',
    train_number: 'REG 2986',
    minutes: 3,
    following_minutes: 13,
    delay: 0,
    expected_time: '22:55',
    scheduled_time: '22:55',
    platform: '8',
    cancelled: 0,
  });
  await action(world, 'remove_station', { name: 'Milano Centrale' });
  const gone = await world.fake.sceneAction('get_next_departures', {
    station: device.external_id,
  });
  assert.equal(gone.success, false);
  assert.match(gone.error.fr, /Cette gare n'est plus suivie/);
});

test('the widget: a row per departure, coloured by delay, within the core budget', async (t) => {
  const { world, device } = await watched(t, 'Roma Termini', 'Roma Termini');
  const ack = await world.fake.widgetGet('departures', {
    settings: { station: device.external_id, rows: '8' },
    language: 'en',
  });
  const content = ack.data.content;
  assert.deepEqual(validateWidgetContent(content), []);
  assert.equal(content.components[0].text, device.name.slice(0, 40));
  const rows = content.components.at(-1).items;
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[1], {
    label: '22:51 → Napoli Centrale',
    value: '0 min · FR 9663 · pl. 3 · +1 min',
    color: 'success',
  });
  assert.equal(rows[3].value, '8 min · ICN 95063 · on time');
  for (const row of rows) {
    assert.ok(row.label.length <= 40 && row.value.length <= 40);
  }
  const bare = await world.fake.widgetGet('departures', {
    settings: { station: device.external_id, show_legend: false, rows: '3' },
    language: 'de',
  });
  assert.equal(bare.data.content.components.length, 2);
  assert.equal(bare.data.content.components[1].items.length, 3);
  assert.equal(
    bare.data.content.components[1].items[0].value,
    '0 Min. · REG 4538 · Gl. 2 EST · pünktli…',
  );
  const none = await world.fake.widgetGet('departures', { settings: {}, language: 'es' });
  assert.match(none.data.content.components[0].text, /Elija una estación/);
});

test('a lost /data: the stations are rebuilt from the Gladys devices', async (t) => {
  const first = await createWorld();
  await action(first, 'add_station', { station: 'S08409', category: 'high_speed' });
  const device = await create(first, 'Roma Termini');
  await first.app.stop();
  const world = await createWorld({ devices: [device] });
  t.after(() => world.app.stop());
  assert.deepEqual(
    world.service.watches.map((watch) => [watch.code, watch.name, watch.category]),
    [['S08409', 'Roma Termini', 'high_speed']],
  );
  assert.equal(lastState(world, device, 'destination'), '22:51 FR 9663 → Napoli Centrale');
});

test('remove: by the name shown in the status; an unknown name fails in red', async (t) => {
  const { world } = await milano(t);
  const failed = await world.fake.action('remove_station', { name: 'Bari' });
  assert.equal(failed.success, false);
  assert.match(failed.error.es, /Ninguna estación seguida se llama «Bari»/);
  const removed = await action(world, 'remove_station', { name: 'milano centrale' });
  assert.match(removed.en, /no longer watched/);
  assert.equal(world.fake.discoveredDevices.length, 0);
  assert.deepEqual(world.service.watches, []);
});

test('the container refreshes on its own timer, without Gladys polling', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { world } = await milano(t, { timers: true });
  const before = world.network.boardRequests().length;
  t.mock.timers.tick(60000);
  await world.service.inflight;
  assert.equal(world.network.boardRequests().length, before + 1);
});

test('a normal cycle writes nothing at the info level', async (t) => {
  const { world } = await milano(t);
  const logs = captureLogs(t, 'info');
  world.network.boards.S01700 = changeTrain(world.network.boards.S01700, 2986, { ritardo: 2 });
  world.clock.advance(60000);
  await world.service.refresh();
  assert.deepEqual(logs, []);
});

test('a train missing from one answer does not fire its delay twice', async (t) => {
  const world = await createWorld({ config: { language: 'en' } });
  t.after(() => world.app.stop());
  const { events } = await stageEverything(world);
  assert.equal(events.filter((event) => event.key === TRIGGERS.DELAYED).length, 2);
  const full = world.network.boards.S01700;
  world.network.boards.S01700 = full.filter((record) => record.numeroTreno !== 2387);
  world.clock.advance(1000);
  await world.service.refresh();
  world.network.boards.S01700 = full;
  world.clock.advance(1000);
  const before = world.fake.sceneEvents.length;
  await world.service.refresh();
  const again = world.fake.sceneEvents
    .slice(before)
    .filter((event) => event.key === TRIGGERS.DELAYED);
  assert.deepEqual(again, []);
});

test('a failed read does not leave a rejection for the next callers', async (t) => {
  const { world } = await milano(t);
  const original = world.service.doRefresh.bind(world.service);
  let calls = 0;
  world.service.doRefresh = async (options) => {
    calls += 1;
    if (calls === 1) {
      throw new Error('boom');
    }
    return original(options);
  };
  const first = world.service.refresh().catch(() => 'failed');
  const queued = world.service.refresh();
  assert.equal(await first, 'failed');
  await queued;
  assert.equal(calls, 2);
});

test('a live board without network sends nothing: createFetch is the only network', () => {
  const network = createFetch();
  assert.deepEqual(Object.keys(network.boards).sort(), ['S00219', 'S01700', 'S06421', 'S08409']);
});
