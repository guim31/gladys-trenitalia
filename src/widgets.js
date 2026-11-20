// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - departures: the board of one watched station — a status row per departure
//   ("22:50 → Napoli Centrale" / "3 min · FR 9663 · pl. 3 · +1 min"), green on
//   time, orange from 3 minutes late, red from 10 and when cancelled; the
//   heading is the name given in Gladys, the caption the legend. The legend
//   and the cancelled trains can be hidden.
//
// Budget of the core: 8 components, 2 texts, a status of 10 rows at most.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { clip } from './devices.js';
import { TEXT, say } from './messages.js';
import { running } from './trains.js';

export const ROW_OPTIONS = [3, 5, 8, 10];
const DEFAULT_ROWS = 5;
const MAX_LABEL = 40;

const t = (language, key, params) => say(TEXT, language, key, params);

export function delayColor(departure) {
  if (departure.cancelled || departure.late >= 10) {
    return WIDGET_COLORS.DANGER;
  }
  return departure.late >= 3 ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS;
}

/** "3 min · FR 9663 · pl. 3 · +1 min": 40 characters at most. */
export function departureValue(departure, language) {
  if (departure.cancelled) {
    return clip(`${departure.number} · ${t(language, 'cancelledShort')}`, 40);
  }
  return clip(
    [
      t(language, 'wait', { minutes: departure.minutes }),
      departure.number,
      ...(departure.platform ? [t(language, 'platform', { platform: departure.platform })] : []),
      departure.late > 0 ? t(language, 'late', { late: departure.late }) : t(language, 'onTime'),
    ].join(' · '),
    40,
  );
}

async function departuresContent(service, { settings, language }) {
  const ttl = Math.max(30, service.config.refreshSeconds);
  if (!settings?.station) {
    return { ttl_seconds: ttl, components: [{ type: 'text', text: t(language, 'pickStation') }] };
  }
  const found = await service.boardOf(settings.station);
  if (!found) {
    return { ttl_seconds: ttl, components: [{ type: 'text', text: t(language, 'gone') }] };
  }
  const { watch } = found;
  // The name the user gave the device in Gladys, else the station.
  const device = (service.gladys.devices ?? []).find((d) => d.external_id === settings.station);
  const components = [
    { type: 'text', variant: 'heading', text: clip(device?.name || watch.name, 40) },
  ];
  if (!found.departures) {
    components.push({ type: 'text', variant: 'body', text: t(language, 'loading') });
    return { ttl_seconds: ttl, components };
  }
  const departures =
    settings.show_cancelled === false ? running(found.departures) : found.departures;
  if (departures.length === 0) {
    components.push({ type: 'text', variant: 'body', text: t(language, 'noDeparture') });
    return { ttl_seconds: ttl, components };
  }
  if (settings.show_legend !== false) {
    components.push({ type: 'text', variant: 'caption', text: t(language, 'legend') });
  }
  const rows = ROW_OPTIONS.includes(Number(settings.rows)) ? Number(settings.rows) : DEFAULT_ROWS;
  components.push({
    type: 'status',
    items: departures.slice(0, rows).map((departure) => ({
      label: clip(`${departure.time || '--:--'} → ${departure.destination}`, MAX_LABEL),
      value: departureValue(departure, language),
      color: delayColor(departure),
    })),
  });
  return { ttl_seconds: ttl, components };
}

export const WIDGETS = {
  departures: { get: departuresContent },
};
