// -----------------------------------------------------------------------------
// The Gladys devices: one per watched station and set of filters (group of
// categories, destination): minutes to the next train that runs and to the
// following one, delay, train and destination, platform, and the number of
// cancelled trains on the board.
//
// Read-only, no polling: the service refreshes everything on its own timer
// (src/service.js), Gladys never polls (`should_poll: false`). Countdowns and
// texts keep no history: a value re-read every minute whose past means nothing
// would write thousands of rows a day per station.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { fold, running } from './trains.js';
import { NAMES, TEXT, groupName, say } from './messages.js';

export const STATION_TYPE = 'station';
// Published when no train is announced.
export const NO_DEPARTURE_MINUTES = 1440;
export const MAX_CANCELLED = 100;
export const MAX_TEXT_STATE = 200;
export const STATION_FEATURES = [
  'next',
  'following',
  'delay',
  'destination',
  'platform',
  'cancelled',
];

/** Shortens a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

const slug = (text) =>
  fold(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * The platform id of a watch: the station code, then its filters ("s01700",
 * "s01700-high_speed-to-napoli"). Two watches of the same station with other
 * filters are two devices.
 */
export function watchKey(watch) {
  return [
    String(watch.code).toLowerCase(),
    ...(watch.category ? [watch.category] : []),
    ...(watch.destination ? ['to', slug(watch.destination)] : []),
  ]
    .filter(Boolean)
    .join('-')
    .slice(0, 80);
}

/** "Roma Termini (Frecce · → Napoli)": the name of a watch. */
export function watchName(watch, language) {
  const filters = [
    ...(watch.category ? [groupName(watch.category, language)] : []),
    ...(watch.destination ? [`→ ${watch.destination}`] : []),
  ];
  return filters.length > 0 ? `${watch.name} (${filters.join(' · ')})` : watch.name;
}

const readOnly = { read_only: true, has_feedback: false, keep_history: false };

const countdown = (name, externalId) => ({
  name,
  external_id: externalId,
  category: DEVICE_FEATURE_CATEGORIES.DURATION,
  type: DEVICE_FEATURE_TYPES.DURATION.INTEGER,
  unit: DEVICE_FEATURE_UNITS.MINUTES,
  min: 0,
  max: NO_DEPARTURE_MINUTES,
  ...readOnly,
});

const text = (name, externalId) => ({
  name,
  external_id: externalId,
  category: DEVICE_FEATURE_CATEGORIES.TEXT,
  type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
  // NOT NULL in the core, even for a text (422 on "Add to Gladys" without).
  min: 0,
  max: 0,
  ...readOnly,
});

/**
 * The device of a watched station.
 * @param {object} gladys
 * @param {{ code: string, name: string, category: string, destination: string }} watch
 * @param {string} language
 */
export function buildStationDevice(gladys, watch, language) {
  const ids = gladys.externalIds(STATION_TYPE, watchKey(watch));
  const names = NAMES[language] ?? NAMES.en;
  return {
    name: clip(`Trenitalia · ${watchName(watch, language)}`, 80),
    external_id: ids.device,
    should_poll: false,
    // What is needed to watch the station again when /data is lost.
    params: [
      { name: 'station_code', value: watch.code },
      { name: 'station_name', value: watch.name },
      { name: 'category', value: watch.category ?? '' },
      { name: 'destination', value: watch.destination ?? '' },
    ],
    features: [
      countdown(names.next, ids.feature('next')),
      countdown(names.following, ids.feature('following')),
      countdown(names.delay, ids.feature('delay')),
      text(names.destination, ids.feature('destination')),
      text(names.platform, ids.feature('platform')),
      {
        name: names.cancelled,
        external_id: ids.feature('cancelled'),
        category: DEVICE_FEATURE_CATEGORIES.COUNTER_SENSOR,
        type: DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
        min: 0,
        max: MAX_CANCELLED,
        // Kept: how many trains were cancelled, over the days, is worth a chart.
        read_only: true,
        has_feedback: false,
      },
    ],
  };
}

/** "22:50 FR 9663 → Napoli Centrale", or "No train announced". */
export function departureText(departure, language) {
  if (!departure) {
    return say(TEXT, language, 'noDeparture');
  }
  const time = departure.time ? `${departure.time} ` : '';
  return clip(`${time}${departure.number} → ${departure.destination}`, MAX_TEXT_STATE);
}

/**
 * The states of a watched station.
 * @param {object} gladys
 * @param {object} watch
 * @param {object[]} departures the departures of the watch (applyFilters, aged), cancelled included
 * @param {string} language
 */
export function stationStates(gladys, watch, departures, language) {
  const ids = gladys.externalIds(STATION_TYPE, watchKey(watch));
  const [next, following] = running(departures);
  const minutes = (departure) =>
    departure ? Math.min(departure.minutes, NO_DEPARTURE_MINUTES) : NO_DEPARTURE_MINUTES;
  return [
    { device_feature_external_id: ids.feature('next'), state: minutes(next) },
    { device_feature_external_id: ids.feature('following'), state: minutes(following) },
    {
      device_feature_external_id: ids.feature('delay'),
      state: next ? Math.min(next.late, NO_DEPARTURE_MINUTES) : 0,
    },
    {
      device_feature_external_id: ids.feature('destination'),
      text: departureText(next, language),
    },
    {
      device_feature_external_id: ids.feature('platform'),
      text: clip(next?.platform || say(TEXT, language, 'noPlatform'), MAX_TEXT_STATE),
    },
    {
      device_feature_external_id: ids.feature('cancelled'),
      state: Math.min(departures.filter((departure) => departure.cancelled).length, MAX_CANCELLED),
    },
  ];
}
