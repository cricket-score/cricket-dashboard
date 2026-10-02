import { z } from 'zod';
import { derive } from './engine';
import { matchSchema, type Match } from './model';

export const updateSchema = z.object({ data: matchSchema, revision: z.number().int().nonnegative(), operationId: z.string().uuid() });
export function validateUpdate(old: Match, next: Match) {
  derive(next);
  if (!old.events.length || !next.events.length) return;
  const before = old.config, after = next.config;
  if (before.overs !== after.overs || before.tossWinner !== after.tossWinner || before.tossDecision !== after.tossDecision || before.freeHit !== after.freeHit ||
      JSON.stringify(before.teams.map(t => [t.id, t.players.map(p => p.id)])) !== JSON.stringify(after.teams.map(t => [t.id, t.players.map(p => p.id)]))) {
    throw new Error('Overs, toss, playing rules and player IDs are locked once scoring starts. Names and logos can still be edited.');
  }
}
