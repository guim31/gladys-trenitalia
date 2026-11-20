// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake `fetch` answering like
// Viaggiatreno from the real answers of test/fixtures/viaggiatreno (captured on
// Friday 2026-11-20 at 22:52 in Italy: Milano Centrale, Roma Termini with
// Frecciarossa, Intercity and a cancelled regional train, Firenze Santa Maria
// Novella where the three last trains of the evening are cancelled, Torino
// Porta Nuova whose only train has left; the station searches of "milano",
// "roma", "firenze", "torino" and "forli"), a manual clock, a temporary /data,
// and the integration wired on top through registerHandlers. Nothing touches
// the network.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { Store } from '../../src/store.js';
import { USER_AGENT } from '../../src/viaggiatreno.js';

process.env.LOG_LEVEL ??= 'silent';
process.env.TZ = 'Europe/Rome';

const fixturePath = (name) => new URL(`../fixtures/viaggiatreno/${name}`, import.meta.url);
export const fixture = (name) => JSON.parse(readFileSync(fixturePath(name), 'utf8'));

// 2026-11-20 22:52:00 in Italy: the time the boards were read.
export const FIXTURE_TIME = Date.parse('2026-11-20T21:52:00Z');

export const STATION_CODES = ['S01700', 'S08409', 'S06421', 'S00219'];
// The region of each recorded station (`regione/<code>`).
const REGIONS = { S01700: 1, S08409: 5, S06421: 13, S00219: 3 };

/** The departures of a recorded board (a copy the test may change). */
export const recordedBoard = (code) => fixture(`partenze-${code}.json`);

/** Every station of the recorded searches. */
export const recordedStations = () =>
  ['milano', 'roma', 'firenze', 'torino', 'forli'].flatMap((name) => fixture(`cerca-${name}.json`));

/**
 * A fake `fetch` answering like Viaggiatreno. `boards` holds the departures
 * each station answers (change them to stage a delay); `fail` makes every
 * request fail with an Error or an HTTP status. Every call is recorded in
 * `calls`; a request without the browser-like User-Agent gets a 403, like
 * Akamai answers it.
 */
export function createFetch() {
  const boards = {};
  for (const code of STATION_CODES) {
    boards[code] = recordedBoard(code);
  }
  const stations = recordedStations();
  const network = { boards, calls: [], fail: null };
  const json = (data) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  network.fetch = async (url, options = {}) => {
    network.calls.push({ url });
    if (network.fail instanceof Error) {
      throw network.fail;
    }
    if (typeof network.fail === 'number') {
      return new Response('<html>error</html>', { status: network.fail });
    }
    if (options.headers?.['User-Agent'] !== USER_AGENT) {
      return new Response('<HTML>Access Denied</HTML>', { status: 403 });
    }
    const [, method, ...rest] = new URL(url).pathname.match(/viaggiatreno\/(\w+)\/(.*)$/) ?? [];
    const args = rest.join('/').split('/').map(decodeURIComponent);
    if (method === 'cercaStazione') {
      return json(stations.filter((station) => station.nomeLungo.startsWith(args[0])));
    }
    if (method === 'regione') {
      return REGIONS[args[0]]
        ? new Response(String(REGIONS[args[0]]), { status: 200 })
        : new Response(null, { status: 204 });
    }
    if (method === 'dettaglioStazione') {
      const station = stations.find((entry) => entry.id === args[0]);
      return json({ codiceStazione: args[0], localita: station });
    }
    if (method === 'partenze') {
      // The date must be the English JavaScript form, else a 400.
      if (!/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT\+0000$/.test(args[1])) {
        return new Response('Error', { status: 400 });
      }
      return json(network.boards[args[0]] ?? []);
    }
    return new Response('not found', { status: 404 });
  };
  network.boardRequests = () => network.calls.filter((call) => /partenze/.test(call.url));
  return network;
}

/** Changes the departure of one train on a board. */
export const changeTrain = (records, number, change) =>
  records.map((record) => (record.numeroTreno === number ? { ...record, ...change } : record));
/** A manual clock. */
export function createClock(start = FIXTURE_TIME) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {object} [options.network] from createFetch
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {object} [options.saved] content of /data/watch.json before the start
 * @param {boolean} [options.connect]
 * @param {boolean} [options.timers]
 */
export async function createWorld({
  config = {},
  network = createFetch(),
  devices = [],
  saved,
  connect = true,
  timers = false,
  clock = createClock(),
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-trenitalia-')),
} = {}) {
  const gladys = createFakeGladys({ config, devices });
  const store = new Store(dataDir);
  if (saved) {
    await store.save(saved);
    await store.flush();
  }
  const app = registerHandlers(gladys, {
    store,
    fetch: network.fetch,
    timers,
    now: clock.now,
    dataDir,
  });
  const world = { gladys, fake: gladys.fake, app, service: app.service, network, clock, store };
  if (connect) {
    await gladys.connect();
    await app.ready;
  }
  return world;
}

/** Run a configuration action; resolves with its message (multi-language). */
export async function action(world, key, fields = {}) {
  const ack = await world.fake.action(key, fields);
  if (!ack.success) {
    throw new Error(`action ${key} failed: ${JSON.stringify(ack.error)}`);
  }
  return ack.data.message;
}

/** The discovered device whose name contains `name`. */
export function discovered(world, name) {
  const device = world.fake.discoveredDevices.find((d) => d.name.includes(name));
  if (!device) {
    throw new Error(`no discovered device named ${name}`);
  }
  return device;
}

/** "Add to Gladys" on the discovered device named `name`; resolves with it. */
export async function create(world, name) {
  const device = discovered(world, name);
  await world.fake.deviceCreated(device);
  return device;
}

/** The last state published on a feature of a device. */
export const lastState = (world, device, key) =>
  world.fake.lastState(`${device.external_id}:${key}`);

/** Captures the log lines of the integration at `level` and above. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
