// -----------------------------------------------------------------------------
// From the raw Viaggiatreno departures to what the integration works with: the
// trains still to leave a station (minutes, delay, platform, cancelled), the
// filters of a watch and the names. Pure functions: the clock is a parameter.
// -----------------------------------------------------------------------------

// The groups of categories a watch can keep (manifest action `add_station`).
// Viaggiatreno names the category of a train by a code: REG, RV (regional),
// FR, FA, FB (Frecciarossa, Frecciargento, Frecciabianca), IC, ICN, EC, EN.
export const CATEGORY_GROUPS = {
  regional: ['REG', 'RV', 'R', 'RE', 'IR', 'MET', 'SUB', 'ACC', 'D', 'DIR'],
  high_speed: ['FR', 'FA', 'FB'],
  intercity: ['IC', 'ICN', 'EC', 'EN'],
};
export const CATEGORIES = Object.keys(CATEGORY_GROUPS);
// Provvedimento 1: the train is cancelled (3, a diversion, still runs).
const CANCELLED = 1;
const ROME_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Lower case, without accents nor apostrophes nor punctuation: "Forlì" matches "FORLI'". */
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SMALL_WORDS = new Set(['di', 'del', 'della', 'dei', 'delle', 'da', 'in', 'a', 'al', 'sul']);

/** "NAPOLI CENTRALE" → "Napoli Centrale", "REGGIO DI CALABRIA" → "Reggio di Calabria". */
export function titleCase(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s\-.'(/])(\p{L})(\p{L}*)/gu, (whole, before, first, rest, offset) =>
      offset > 0 && before === ' ' && SMALL_WORDS.has(first + rest)
        ? whole
        : `${before}${first.toUpperCase()}${rest}`,
    );
}

/** "22:50", the time of Italy. */
export const romeTime = (ms) => (Number.isFinite(ms) ? ROME_TIME.format(new Date(ms)) : '');

/** The group of a category code ("FR" → "high_speed"), or "" when none. */
export const groupOf = (category) =>
  CATEGORIES.find((group) => CATEGORY_GROUPS[group].includes(category)) ?? '';

/**
 * One departure per train still to leave the station, soonest first.
 * @param {object[]} records from Viaggiatreno.departures
 * @param {number} now ms, when the records were read
 */
export function parseDepartures(records, now) {
  const departures = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const number = Number(record?.numeroTreno);
    const scheduledAt = Number(record?.orarioPartenza);
    if (!Number.isFinite(number) || !Number.isFinite(scheduledAt)) {
      continue;
    }
    // Gone: a train Viaggiatreno saw leave ("Partito").
    if (/partit/i.test(record.compInStazionePartenza?.[0] ?? '')) {
      continue;
    }
    const key = `${number}|${record.dataPartenzaTreno ?? ''}`;
    if (departures.has(key)) {
      continue;
    }
    // The category: "FR" lives in categoriaDescrizione only (" FR"), "REG" in both.
    const category = String(record.categoriaDescrizione || record.categoria || '')
      .trim()
      .toUpperCase();
    const cancelled = Number(record.provvedimento) === CANCELLED;
    // Null until the train has left its origin: on time as far as anyone knows.
    const late = cancelled ? 0 : Math.max(0, Math.round(Number(record.ritardo) || 0));
    // A train past its time but still in the station leaves now.
    const expected = Math.max(scheduledAt + late * 60000, now);
    const platform = String(
      record.binarioEffettivoPartenzaDescrizione ||
        record.binarioProgrammatoPartenzaDescrizione ||
        '',
    ).trim();
    departures.set(key, {
      key,
      number: String(record.compNumeroTreno ?? `${category} ${number}`)
        .replace(/\s+/g, ' ')
        .trim(),
      category,
      group: groupOf(category),
      destination: titleCase(record.destinazione) || '?',
      time: romeTime(scheduledAt + late * 60000),
      scheduled: romeTime(scheduledAt),
      late,
      platform,
      cancelled,
      minutes: Math.max(0, Math.ceil((expected - now) / 60000)),
      expected,
    });
  }
  return [...departures.values()].sort((a, b) => a.expected - b.expected);
}

/**
 * The departures a watch keeps: its group of categories and its destination
 * (a part of the destination name).
 * @param {object[]} departures from parseDepartures
 * @param {{ category?: string, destination?: string }} watch
 */
export function applyFilters(departures, watch) {
  const destination = fold(watch.destination);
  return departures.filter(
    (departure) =>
      (!watch.category || departure.group === watch.category) &&
      (!destination || fold(departure.destination).includes(destination)),
  );
}

/**
 * The departures of an earlier read, as of `now`: minutes counted again, the
 * gone ones dropped.
 */
export const aged = (departures, now) =>
  departures
    .filter((departure) => departure.expected >= now - 60000)
    .map((departure) => ({
      ...departure,
      minutes: Math.max(0, Math.ceil((departure.expected - now) / 60000)),
    }));

/** The trains that run: a cancelled one is never "the next train". */
export const running = (departures) => departures.filter((departure) => !departure.cancelled);

/**
 * The station a typed text designates among search results: the exact name,
 * else the only result.
 * @param {{ code: string, name: string }[]} stations
 * @param {string} text
 * @returns {{ code: string, name: string }[]} one station, or the candidates
 */
export function pickStations(stations, text) {
  const wanted = fold(text);
  const exact = stations.filter((station) => fold(station.name) === wanted);
  return exact.length > 0 ? exact : stations;
}
