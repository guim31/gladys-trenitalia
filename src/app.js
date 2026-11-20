// -----------------------------------------------------------------------------
// Registers every SDK handler on a GladysIntegration (or the SDK's fake Gladys)
// and returns the service, so index.js stays a few lines and the tests drive
// the very same wiring.
//
// Every failure of an action (nothing found, Viaggiatreno down) is thrown as an
// ActionFailure: Gladys shows it in red, in the user's language. Only real
// successes are returned.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './config.js';
import { INIT_FAILED } from './messages.js';
import { SCENE_ACTIONS } from './scenes.js';
import { TrenitaliaService } from './service.js';
import { Store } from './store.js';
import { WIDGETS } from './widgets.js';

const logger = createLogger({ name: 'trenitalia-app' });

/**
 * @param {object} gladys GladysIntegration instance
 * @param {object} [options] test seams: store, fetch, now, timers, dataDir
 */
export function registerHandlers(gladys, options = {}) {
  const service = new TrenitaliaService({
    gladys,
    store: options.store ?? new Store(options.dataDir),
    fetch: options.fetch,
    now: options.now,
    timers: options.timers ?? true,
  });

  // Resolved once the service has started; every handler waits for it, so a
  // request arriving during the start is not lost.
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  let started = false;
  const whenReady =
    (fn) =>
    async (...args) => {
      await ready;
      return fn(...args);
    };

  gladys.on('connected', async () => {
    try {
      const config = normalizeConfig(await gladys.getConfig());
      if (started) {
        // A reconnection (Gladys restarted): publish everything again.
        await service.resync(config);
        return;
      }
      await service.start(config);
      // Only once started: a failed start is tried again at the next connection.
      started = true;
    } catch (err) {
      logger.error('Initialization failed', err);
      await gladys.setConnectionStatus(false, INIT_FAILED).catch(() => {});
    } finally {
      resolveReady();
    }
    // The first read after the handlers are free: an action never waits for
    // Viaggiatreno to answer for every watched station.
    if (started) {
      await service.refresh().catch((err) => logger.error('First read failed', err));
    }
  });

  // Devices are published with should_poll: false (refreshed by the service's
  // own timer); this only serves a Gladys that would poll anyway.
  gladys.onPoll(whenReady(() => service.poll()));

  gladys.onScanRequest(whenReady(() => service.publishDiscovered()));

  gladys.onDeviceCreated(whenReady((device) => service.onDeviceCreated(device)));

  // The widget shows the name given in Gladys.
  const refreshWidget = async () => gladys.requestWidgetRefresh?.('departures');
  gladys.onDeviceUpdated(whenReady(refreshWidget));
  gladys.onDeviceDeleted(whenReady(refreshWidget));

  gladys.onConfigUpdated(whenReady((newConfig) => service.reconfigure(normalizeConfig(newConfig))));

  const actions = {
    search_stations: (fields) => service.searchStations(fields),
    add_station: (fields) => service.addStation(fields),
    remove_station: (fields) => service.removeStation(fields),
    status: () => service.status(),
  };
  for (const [key, handler] of Object.entries(actions)) {
    gladys.onAction(key, whenReady(handler));
  }

  for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
    gladys.onSceneAction(
      key,
      whenReady((fields) => handler(service, { fields })),
    );
  }

  for (const [key, widget] of Object.entries(WIDGETS)) {
    gladys.onWidgetGet(
      key,
      whenReady((request) => widget.get(service, request)),
    );
  }

  return {
    service,
    ready,
    actions: Object.keys(actions),
    stop: () => service.stop(),
  };
}
