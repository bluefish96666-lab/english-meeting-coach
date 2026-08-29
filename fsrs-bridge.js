/* Load official FSRS (ts-fsrs) for the static app. */
import { createEmptyCard, fsrs, Rating, State, FSRSVersion } from './vendor/ts-fsrs.mjs';

window.tsfsrs = {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  FSRSVersion,
  scheduler: fsrs({
    enable_fuzz: false,
    enable_short_term: true,
  }),
};

window.dispatchEvent(new Event('tsfsrs-ready'));
