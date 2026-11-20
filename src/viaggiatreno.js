// -----------------------------------------------------------------------------
// Viaggiatreno (http://www.viaggiatreno.it), the real-time board of RFI and
// Trenitalia: public, without key, not documented nor officially supported.
// Three reads: the station search, the region of a station code (needed to
// read its name) and the departures of a station from a given time.
//
// Its CDN (Akamai) answers 403 to a client without a User-Agent or with a
// command-line one (curl), and 400 to a date not written the JavaScript way in
// English ("Fri Nov 20 2026 21:52:00 GMT+0000"): both are handled here.
// It is served over plain HTTP (HTTPS redirects back to it).
// -----------------------------------------------------------------------------

export const API_URL = 'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno';
const HOST = 'viaggiatreno.it';
const TIMEOUT_MS = 20000;
// A browser-like agent naming the integration: Akamai refuses the others.
export const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) gladys-trenitalia';
// RFI station codes: "S01700" (Milano Centrale).
export const STATION_CODE = /^S\d{5}$/;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (value) => String(value).padStart(2, '0');

export class ViaggiatrenoError extends Error {}

/**
 * The date the way Viaggiatreno wants it, in UTC and in English whatever the
 * locale of the container: "Fri Nov 20 2026 21:52:00 GMT+0000".
 * @param {number} ms
 */
export function apiDate(ms) {
  const date = new Date(ms);
  return `${DAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${pad(date.getUTCDate())} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} GMT+0000`;
}

/** The text of a search as Viaggiatreno matches it: without accents ("Forlì" → "FORLI"). */
export const searchText = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export class Viaggiatreno {
  /** @param {{ fetch?: typeof fetch, now?: () => number }} [options] */
  constructor({ fetch: fetchImpl = globalThis.fetch, now = Date.now } = {}) {
    this.fetch = fetchImpl;
    this.now = now;
  }

  /** The body of a GET, as text ("" for a 204). */
  async get(path) {
    let response;
    try {
      response = await this.fetch(`${API_URL}/${path}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/plain' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new ViaggiatrenoError(
        `${HOST}: ${err.name === 'TimeoutError' ? 'timeout' : 'unreachable'}`,
      );
    }
    if (response.status === 403) {
      throw new ViaggiatrenoError(`${HOST}: HTTP 403 (refused by its CDN)`);
    }
    if (!response.ok) {
      throw new ViaggiatrenoError(`${HOST}: HTTP ${response.status}`);
    }
    return response.text().catch(() => '');
  }

  /** A JSON array, or an error: a maintenance page is never an empty list. */
  async list(path) {
    const text = await this.get(path);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ViaggiatrenoError(`${HOST}: unexpected answer`);
    }
    if (!Array.isArray(data)) {
      throw new ViaggiatrenoError(`${HOST}: unexpected answer`);
    }
    return data;
  }

  /** The stations whose name starts with a text: [{ code, name }] (raw upper-case names). */
  async search(text) {
    const wanted = searchText(text);
    if (!wanted) {
      return [];
    }
    const list = await this.list(`cercaStazione/${encodeURIComponent(wanted)}`);
    return list
      .map((entry) => ({
        code: String(entry?.id ?? ''),
        name: String(entry?.nomeLungo ?? '').trim(),
      }))
      .filter((station) => STATION_CODE.test(station.code) && station.name);
  }

  /** The station of a code, or null when Viaggiatreno does not know it. */
  async station(code) {
    if (!STATION_CODE.test(code)) {
      return null;
    }
    const region = (await this.get(`regione/${code}`)).trim();
    if (!/^\d+$/.test(region)) {
      return null;
    }
    let detail;
    try {
      detail = JSON.parse(await this.get(`dettaglioStazione/${code}/${region}`));
    } catch {
      throw new ViaggiatrenoError(`${HOST}: unexpected answer`);
    }
    const name = String(detail?.localita?.nomeLungo ?? '').trim();
    return name ? { code, name } : null;
  }

  /**
   * The raw departures of a station from now: the trains of the next hour or
   * two, the ones that just left included. An unknown code answers [].
   */
  async departures(code) {
    if (!STATION_CODE.test(code)) {
      return [];
    }
    return this.list(`partenze/${code}/${encodeURIComponent(apiDate(this.now()))}`);
  }
}
