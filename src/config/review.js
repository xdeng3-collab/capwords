// ==================== Review ====================
// Words come back for review on a Leitner schedule: every word starts in box
// 0 and is due the day after it was learned. Remembering it moves it up a box
// and pushes the next review out to that box's interval; forgetting it sends
// it back to box 0, due tomorrow.
export const REVIEW = {
  intervals: [1, 2, 4, 7, 15, 30], // days until the next review, by box
  sessionSize: 5, // words per review session at most
  choices: 4, // answers offered per question, the right one included
};
