// -----------------------------------------------------------------------------
// A scenario staging the three triggers on the real evening data of Milano
// Centrale: the first read is silent, then, a minute later, the REG 2986 to
// Saronno leaves in 2 minutes ("time to leave"), the REG 2387 to Voghera
// reports 12 minutes of delay and the REG 24886 to Lecco is cancelled.
// -----------------------------------------------------------------------------

import { action, changeTrain, create } from './world.js';

/** Resolves with the station device and the scene events fired after the first read. */
export async function stageEverything(world) {
  await action(world, 'add_station', { station: 'S01700' });
  const station = await create(world, 'Milano Centrale');
  const before = world.fake.sceneEvents.length;
  let board = changeTrain(world.network.boards.S01700, 2387, { ritardo: 12 });
  board = changeTrain(board, 24886, { provvedimento: 1 });
  world.network.boards.S01700 = board;
  world.clock.advance(60000);
  await world.service.refresh();
  return { station, events: world.fake.sceneEvents.slice(before) };
}
