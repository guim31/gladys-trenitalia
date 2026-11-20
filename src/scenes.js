// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// - get_next_departures: the next trains that run from a watched station, as
//   numbers for a "Continue only if" step and as a sentence ready for a
//   message or a speaker ("FR 9663 to Napoli Centrale from Roma Termini: in 3
//   min, platform 3, 1 min late").
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers and strings, never
// booleans: the core's "Continue only if" compares with ===.
// -----------------------------------------------------------------------------

import { NO_DEPARTURE_MINUTES } from './devices.js';
import { ActionFailure, TEXT, sayAll, say } from './messages.js';
import { running } from './trains.js';

export const SCENE_ACTIONS = {
  async get_next_departures(service, { fields }) {
    const language = service.config.language;
    const found = await service.boardOf(fields?.station);
    if (!found) {
      throw new ActionFailure(sayAll(TEXT, 'gone'));
    }
    if (!found.departures) {
      throw new ActionFailure(sayAll(TEXT, 'unavailable'));
    }
    const { watch, departures } = found;
    const cancelled = departures.length - running(departures).length;
    const [next, following] = running(departures);
    if (!next) {
      return {
        sentence: say(TEXT, language, 'nothingAt', { station: watch.name }),
        station_name: watch.name,
        destination: '',
        category: '',
        train_number: '',
        minutes: NO_DEPARTURE_MINUTES,
        following_minutes: NO_DEPARTURE_MINUTES,
        delay: 0,
        expected_time: '',
        scheduled_time: '',
        platform: '',
        cancelled,
      };
    }
    return {
      sentence: service.sentence(watch, departures, language),
      station_name: watch.name,
      destination: next.destination,
      category: next.category,
      train_number: next.number,
      minutes: next.minutes,
      following_minutes: following ? following.minutes : NO_DEPARTURE_MINUTES,
      delay: next.late,
      expected_time: next.time,
      scheduled_time: next.scheduled,
      platform: next.platform,
      cancelled,
    };
  },
};
