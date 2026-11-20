// -----------------------------------------------------------------------------
// The Trenitalia service: the watched stations (configuration actions, /data),
// their devices, the refresh timer (one departures request per watched
// station), the states and the scene triggers.
//
// Triggers never fire at the first read after a start: what was already there
// when the integration started is not news. Their memories live in RAM only
// (a train lives on the board for an hour or two, and /data is often an SD card).
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import {
  STATION_TYPE,
  buildStationDevice,
  clip,
  stationStates,
  watchKey,
  watchName,
} from './devices.js';
import { ActionFailure, TEXT, say, sayAll } from './messages.js';
import {
  CATEGORIES,
  aged,
  applyFilters,
  fold,
  parseDepartures,
  pickStations,
  running,
  titleCase,
} from './trains.js';
import { STATION_CODE, Viaggiatreno } from './viaggiatreno.js';

const logger = createLogger({ name: 'trenitalia' });

export const TRIGGERS = {
  SOON: 'departure_soon',
  DELAYED: 'train_delayed',
  CANCELLED: 'train_cancelled',
};
// Options of the threshold filters (manifest `scene_triggers`).
export const SOON_MINUTES = [1, 2, 3, 4, 5, 7, 10, 12, 15, 20, 30];
export const DELAY_MINUTES = [5, 10, 15, 20, 30, 45, 60];

export const MAX_WATCHES = 10;
const SEARCH_RESULTS = 10;
const LANGS = ['en', 'fr', 'de', 'es'];
// A value that does not change is published again this often, so that Gladys
// does not show it as stale ("no recent value" after 48 h).
const HEARTBEAT_MS = 6 * 3600 * 1000;
// How long the trigger memory of a train outlives its expected time.
const MEMORY_MS = 30 * 60 * 1000;
// Scene events sent per minute at most: the core refuses more than 300.
const EVENTS_PER_MINUTE = 200;

const each = (fn) => Object.fromEntries(LANGS.map((lang) => [lang, fn(lang)]));

const fail = (key, params) => new ActionFailure(sayAll(TEXT, key, params));

export class TrenitaliaService {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the fake one)
   * @param {object} options.store Store (src/store.js)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: refresh by hand
   */
  constructor({ gladys, store, fetch, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.store = store;
    this.config = { language: 'fr', refreshSeconds: 60 };
    this.api = new Viaggiatreno({ fetch, now });
    this.now = now;
    this.timers = timers;
    this.watches = [];
    this.removed = [];
    // watchKey → { departures, at }
    this.boards = new Map();
    // watchKey → Map(train key → { soon: Set, delay: Set, cancelled }), RAM only.
    this.seen = new Map();
    this.refreshedAt = 0;
    this.attemptedAt = 0;
    this.lastError = null;
    this.inflight = null;
    this.timer = null;
  }

  // --- Lifecycle ---------------------------------------------------------------

  async start(config) {
    this.config = config;
    const saved = await this.store.load();
    this.watches = Array.isArray(saved.watches)
      ? saved.watches.filter((watch) => STATION_CODE.test(watch?.code ?? ''))
      : [];
    this.removed = Array.isArray(saved.removed) ? saved.removed : [];
    await this.restoreFromDevices();
    await this.publishDiscovered();
    await this.gladys.setConnectionStatus(true).catch(() => {});
    this.startTimer();
    await this.refresh();
  }

  async resync(config) {
    await this.reconfigure(config, { force: true });
  }

  async reconfigure(config, { force = false } = {}) {
    const previous = this.config;
    this.config = config;
    if (previous.refreshSeconds !== config.refreshSeconds) {
      this.startTimer();
    }
    if (force || previous.language !== config.language) {
      // The device names follow the language; the feature names stay as they
      // were created (frozen by the core).
      await this.publishDiscovered();
      await this.refresh({ republish: true });
    }
  }

  startTimer() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.timers) {
      this.timer = setInterval(() => {
        this.refresh().catch((err) => logger.error('Refresh failed', err));
      }, this.config.refreshSeconds * 1000);
      this.timer.unref?.();
    }
  }

  async stop() {
    clearInterval(this.timer);
    this.timer = null;
    await this.inflight?.catch(() => {});
    await this.store.flush();
  }

  save() {
    return this.store.save({ watches: this.watches, removed: this.removed });
  }

  // --- Devices ----------------------------------------------------------------

  deviceId(watch) {
    return this.gladys.externalIds(STATION_TYPE, watchKey(watch)).device;
  }

  isCreated(externalId) {
    return (this.gladys.devices ?? []).some((device) => device.external_id === externalId);
  }

  watchOfDevice(externalId) {
    return this.watches.find((watch) => this.deviceId(watch) === externalId) ?? null;
  }

  createdWatches() {
    return this.watches.filter((watch) => this.isCreated(this.deviceId(watch)));
  }

  /** The stations of the devices created in Gladys but missing from /data. */
  async restoreFromDevices() {
    let devices;
    try {
      devices = await this.gladys.getDevices();
    } catch (err) {
      logger.warn(`Cannot read the devices of the integration: ${err.message}`);
      return;
    }
    const param = (device, name) => device.params?.find((p) => p.name === name)?.value ?? '';
    let changed = false;
    for (const device of devices ?? []) {
      const code = String(param(device, 'station_code'));
      if (!STATION_CODE.test(code)) {
        continue;
      }
      const category = String(param(device, 'category'));
      const watch = {
        code,
        name: param(device, 'station_name') || code,
        category: CATEGORIES.includes(category) ? category : '',
        destination: String(param(device, 'destination')),
      };
      const key = watchKey(watch);
      // A station removed by the user keeps its device until deleted: not restored.
      if (!this.removed.includes(key) && !this.watches.some((w) => watchKey(w) === key)) {
        this.watches.push(watch);
        changed = true;
      }
    }
    if (changed) {
      logger.info(`${this.watches.length} station(s) restored from the Gladys devices`);
      await this.save();
    }
  }

  async publishDiscovered() {
    const language = this.config.language;
    try {
      await this.gladys.publishDiscoveredDevices(
        this.watches.map((watch) => buildStationDevice(this.gladys, watch, language)),
      );
    } catch (err) {
      logger.warn(`Cannot publish the discovered devices: ${err.message}`);
    }
  }

  async onDeviceCreated(device) {
    if (!this.watchOfDevice(device?.external_id)) {
      return;
    }
    // A state published before the device existed was dropped by the core:
    // everything again, then the widgets showing it.
    await this.refresh({ republish: true });
    this.gladys.requestWidgetRefresh?.('departures');
  }

  // --- Refresh ----------------------------------------------------------------

  /** Polling fallback: Gladys does not poll these devices, but if it did. */
  async poll() {
    const last = Math.max(this.refreshedAt, this.attemptedAt);
    if (this.now() - last >= (this.config.refreshSeconds * 1000) / 2) {
      await this.refresh();
    }
  }

  refresh(options = {}) {
    if (this.inflight) {
      // A read in progress may predate a device just created: one more read
      // after it, shared by every caller arriving meanwhile.
      this.queuedRepublish ||= Boolean(options.republish);
      // After a failed read too: a rejection is never kept for later callers.
      this.queued ??= this.inflight
        .catch(() => {})
        .then(() => {
          const republish = this.queuedRepublish;
          this.queued = null;
          this.queuedRepublish = false;
          return this.refresh({ republish });
        });
      return this.queued;
    }
    this.attemptedAt = this.now();
    this.inflight = this.doRefresh(options).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** One board per station (two watches of one station share it). */
  async read(watches) {
    const boards = new Map();
    let lastFailure = null;
    for (const code of new Set(watches.map((watch) => watch.code))) {
      try {
        const records = await this.api.departures(code);
        boards.set(code, { records, at: this.now() });
      } catch (err) {
        // One station failing does not stop the others: its watches keep
        // their last board. Every one failing is Viaggiatreno down.
        lastFailure = err;
        logger.debug(`Cannot read the board of ${code}: ${err.message}`);
      }
    }
    if (lastFailure && boards.size === 0) {
      throw lastFailure;
    }
    return boards;
  }

  async doRefresh({ republish = false } = {}) {
    const watches = this.createdWatches();
    if (watches.length === 0) {
      return;
    }
    let boards;
    try {
      boards = await this.read(watches);
    } catch (err) {
      if (!this.lastError) {
        logger.warn(`Cannot read Viaggiatreno: ${err.message}`);
        await this.gladys
          .setConnectionStatus(false, sayAll(TEXT, 'serviceDown', { error: err.message }))
          .catch(() => {});
      } else {
        logger.debug(`Cannot read Viaggiatreno: ${err.message}`);
      }
      this.lastError = err.message;
      // The countdowns go on from the last expected times.
      await this.publishAll({ force: republish });
      return;
    }
    if (this.lastError) {
      logger.info('Viaggiatreno reachable again');
      this.lastError = null;
      await this.gladys.setConnectionStatus(true).catch(() => {});
    }
    this.refreshedAt = this.now();
    const events = [];
    for (const watch of watches) {
      const board = boards.get(watch.code);
      // Removed while Viaggiatreno was read, or its station failed: kept as is.
      if (!board || !this.watches.includes(watch)) {
        continue;
      }
      const departures = applyFilters(parseDepartures(board.records, board.at), watch);
      this.boards.set(watchKey(watch), { departures, at: board.at });
      events.push(...this.detect(watch, departures));
    }
    await this.publishAll({ force: republish });
    for (const { key, data } of events) {
      await this.fire(key, data);
    }
  }

  async publishAll({ force = false } = {}) {
    const language = this.config.language;
    const states = [];
    for (const watch of this.createdWatches()) {
      const board = this.boards.get(watchKey(watch));
      if (board) {
        states.push(
          ...stationStates(this.gladys, watch, aged(board.departures, this.now()), language),
        );
      }
    }
    if (states.length === 0) {
      return;
    }
    if (force) {
      this.gladys.forgetPublishedStates?.();
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      // Gladys restarting: said once, the next refresh sends them again.
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  // --- Scene triggers ----------------------------------------------------------

  /** The data every event of a departure carries. */
  eventData(watch, departure) {
    return {
      station: this.deviceId(watch),
      station_name: watch.name,
      destination: departure.destination,
      category: departure.category,
      train_number: departure.number,
      minutes: departure.minutes,
      delay: departure.late,
      expected_time: departure.time,
      scheduled_time: departure.scheduled,
      platform: departure.platform,
    };
  }

  /**
   * The three triggers, each once per train: "time to leave" when the
   * countdown reaches a threshold, "train delayed" when the delay reaches one,
   * "train cancelled" when a train is announced cancelled. A cancelled train
   * never says "time to leave".
   */
  detect(watch, departures) {
    const key = watchKey(watch);
    const firstRead = !this.seen.has(key);
    const previous = this.seen.get(key) ?? new Map();
    const current = new Map();
    const events = [];
    // A countdown threshold crossed long before this read (Viaggiatreno down,
    // a 5-minute interval) is too late to announce: marked, not fired.
    const slack = Math.ceil(this.config.refreshSeconds / 60);
    for (const departure of departures) {
      const memory = previous.get(departure.key);
      const delay = departure.late;
      if (!memory) {
        // First seen: the countdown thresholds already passed are not news; a
        // delay or a cancellation is, except at the first read after a start.
        current.set(departure.key, {
          expected: departure.expected,
          soon: new Set(SOON_MINUTES.filter((minutes) => departure.minutes <= minutes)),
          delay: new Set(firstRead ? DELAY_MINUTES.filter((minutes) => delay >= minutes) : []),
          cancelled: firstRead && departure.cancelled,
        });
        if (firstRead) {
          continue;
        }
      }
      const handled = memory ?? current.get(departure.key);
      if (departure.cancelled) {
        if (!handled.cancelled) {
          handled.cancelled = true;
          events.push({ key: TRIGGERS.CANCELLED, data: this.eventData(watch, departure) });
        }
        handled.expected = departure.expected;
        current.set(departure.key, handled);
        continue;
      }
      for (const threshold of SOON_MINUTES) {
        if (departure.minutes <= threshold && !handled.soon.has(threshold)) {
          handled.soon.add(threshold);
          if (departure.minutes >= threshold - slack) {
            events.push({
              key: TRIGGERS.SOON,
              data: { ...this.eventData(watch, departure), threshold: String(threshold) },
            });
          }
        }
      }
      for (const threshold of DELAY_MINUTES) {
        if (delay >= threshold && !handled.delay.has(threshold)) {
          handled.delay.add(threshold);
          events.push({
            key: TRIGGERS.DELAYED,
            data: { ...this.eventData(watch, departure), threshold: String(threshold) },
          });
        }
      }
      handled.expected = departure.expected;
      current.set(departure.key, handled);
    }
    // A train missing from one answer may come back on the next: its memory
    // is kept until well after its time, so that it never fires twice. Then
    // it has left: forgotten.
    const now = this.now();
    for (const [trainKey, memory] of previous) {
      if (!current.has(trainKey) && memory.expected > now - MEMORY_MS) {
        current.set(trainKey, memory);
      }
    }
    this.seen.set(key, current);
    return events;
  }

  async fire(key, data) {
    const minute = Math.floor(this.now() / 60000);
    if (this.eventMinute !== minute) {
      this.eventMinute = minute;
      this.eventCount = 0;
      this.dropWarned = false;
    }
    this.eventCount += 1;
    if (this.eventCount > EVENTS_PER_MINUTE) {
      if (!this.dropWarned) {
        this.dropWarned = true;
        logger.warn(`More than ${EVENTS_PER_MINUTE} events this minute: the next ones are dropped`);
      }
      return;
    }
    try {
      await this.gladys.publishSceneEvent(key, data);
      this.fireFailed = false;
    } catch (err) {
      // A 429 or Gladys restarting: said once per streak.
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- Readings for the widgets and the scene actions -------------------------

  /** The watch and departures of a station device, or null when it is not watched. */
  async boardOf(externalId) {
    const watch = this.watchOfDevice(externalId);
    if (!watch) {
      return null;
    }
    const interval = this.config.refreshSeconds * 1000;
    const at = this.boards.get(watchKey(watch))?.at;
    if (
      this.isCreated(externalId) &&
      (!at || this.now() - at > interval * 2) &&
      // Viaggiatreno down or just tried: no read per widget load nor scene action.
      !(this.attemptedAt && this.now() - this.attemptedAt < interval)
    ) {
      await this.refresh();
    }
    const board = this.boards.get(watchKey(watch));
    return { watch, departures: board ? aged(board.departures, this.now()) : null };
  }

  // --- Configuration actions -------------------------------------------------

  /** Viaggiatreno down: a red message in every language. */
  async call(fn) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ActionFailure) {
        throw err;
      }
      throw fail('serviceDown', { error: err.message });
    }
  }

  /** "• Milano Centrale [S01700]". */
  stationLine(station) {
    return `• ${station.name} [${station.code}]`;
  }

  /** The stations of a search, named the readable way ("Milano Centrale"). */
  async search(text) {
    const found = await this.call(() => this.api.search(text));
    return found.map((station) => ({ code: station.code, name: titleCase(station.name) }));
  }

  async searchStations({ query } = {}) {
    const text = String(query ?? '').trim();
    if (!text) {
      throw fail('searchNeedText');
    }
    const found = await this.search(text);
    if (found.length === 0) {
      throw fail('searchNone', { query: text });
    }
    const shown = found.slice(0, SEARCH_RESULTS);
    return each(
      (lang) =>
        `${say(TEXT, lang, 'searchFound', { count: found.length })}\n${shown
          .map((station) => this.stationLine(station))
          .join(
            '\n',
          )}${found.length > shown.length ? '\n…' : ''}\n${say(TEXT, lang, 'searchHint')}`,
    );
  }

  /** The station a typed text designates: a code, an exact name or the only match. */
  async resolve(text) {
    const code = text.toUpperCase();
    if (STATION_CODE.test(code)) {
      const station = await this.call(() => this.api.station(code));
      return station ? [{ code, name: titleCase(station.name) }] : [];
    }
    return pickStations(await this.search(text), text);
  }

  async addStation({ station: query, category, destination } = {}) {
    const text = String(query ?? '').trim();
    if (!text) {
      throw fail('searchNeedText');
    }
    const found = await this.resolve(text);
    if (found.length === 0) {
      throw fail('addUnknown', { query: text });
    }
    if (found.length > 1) {
      const list = found
        .slice(0, SEARCH_RESULTS)
        .map((station) => this.stationLine(station))
        .join('\n');
      throw new ActionFailure(each((lang) => `${say(TEXT, lang, 'addAmbiguous')}\n${list}`));
    }
    const [station] = found;
    const watch = {
      code: station.code,
      name: station.name,
      category: CATEGORIES.includes(category) ? category : '',
      // A destination without a letter nor a digit filters nothing.
      destination: /[\p{L}\p{N}]/u.test(String(destination ?? ''))
        ? clip(String(destination).trim(), 40)
        : '',
    };
    const key = watchKey(watch);
    if (this.watches.some((known) => watchKey(known) === key)) {
      return each((lang) => say(TEXT, lang, 'alreadyWatched', { name: watchName(watch, lang) }));
    }
    if (this.watches.length >= MAX_WATCHES) {
      throw fail('tooMany', { max: MAX_WATCHES });
    }
    this.watches.push(watch);
    this.removed = this.removed.filter((removed) => removed !== key);
    await this.save();
    await this.publishDiscovered();
    logger.info(`Station added: ${watchName(watch, 'en')} (${watch.code})`);
    return each((lang) => say(TEXT, lang, 'added', { name: watchName(watch, lang) }));
  }

  async removeStation({ name } = {}) {
    const text = fold(name);
    const matches = this.watches.filter(
      (watch) =>
        LANGS.some((lang) => fold(watchName(watch, lang)) === text) || watchKey(watch) === text,
    );
    const found =
      matches.length > 0
        ? matches
        : this.watches.filter((w) => fold(w.name) === text || w.code.toLowerCase() === text);
    if (found.length === 0) {
      throw fail('removeUnknown', { query: String(name ?? '').trim() });
    }
    if (found.length > 1) {
      throw fail('removeAmbiguous');
    }
    const [watch] = found;
    const key = watchKey(watch);
    this.watches = this.watches.filter((known) => known !== watch);
    this.boards.delete(key);
    this.seen.delete(key);
    if (!this.removed.includes(key)) {
      this.removed.push(key);
    }
    await this.save();
    await this.publishDiscovered();
    logger.info(`Station removed: ${watchName(watch, 'en')}`);
    return each((lang) => say(TEXT, lang, 'removed', { name: watchName(watch, lang) }));
  }

  status() {
    return each((lang) => {
      if (this.watches.length === 0) {
        return say(TEXT, lang, 'statusNone');
      }
      const out = [say(TEXT, lang, 'statusStations', { count: this.watches.length })];
      for (const watch of this.watches) {
        const created = this.isCreated(this.deviceId(watch)) ? 'statusCreated' : 'statusNotCreated';
        out.push(`• ${watchName(watch, lang)} [${watch.code}] — ${say(TEXT, lang, created)}`);
      }
      if (this.refreshedAt) {
        out.push(
          say(TEXT, lang, 'statusRefreshed', {
            age: Math.round((this.now() - this.refreshedAt) / 1000),
          }),
        );
      } else if (this.createdWatches().length === 0) {
        out.push(say(TEXT, lang, 'statusNeverRefreshed'));
      }
      if (this.lastError) {
        out.push(say(TEXT, lang, 'statusError', { error: this.lastError }));
      }
      return out.join('\n');
    });
  }

  /** "FR 9663 to Napoli Centrale from Roma Termini: in 3 min, platform 3, 1 min late, then …". */
  sentence(watch, departures, language) {
    const [first, second] = running(departures);
    const when =
      first.minutes === 0
        ? say(TEXT, language, 'now')
        : say(TEXT, language, 'in', { minutes: first.minutes });
    return `${say(TEXT, language, 'sentence', {
      train: first.number,
      destination: first.destination,
      station: watch.name,
      when,
      platform: first.platform
        ? say(TEXT, language, 'onPlatform', { platform: first.platform })
        : '',
      delay: first.late > 0 ? say(TEXT, language, 'delay', { late: first.late }) : '',
    })}${
      second
        ? say(TEXT, language, 'then', {
            train: second.number,
            destination: second.destination,
            minutes: second.minutes,
          })
        : ''
    }.`;
  }
}
