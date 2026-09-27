// Pet mood is derived from streak + daily progress (Duolingo style).
export const PET = {
  defaultName: 'Biscuit',
  maxNameLength: 12,
  defaultSpecies: 'cat',
};

// Available pet species. Users pick one when naming their buddy and can
// switch for free in the Wardrobe.
export const PET_SPECIES = [
  { id: 'cat', name: 'Cat' },
  { id: 'dog', name: 'Dog' },
  { id: 'bunny', name: 'Bunny' },
];

// Mood levels, worst -> best. Drives pet expression and copy.
export const PET_MOODS = {
  sad: {
    key: 'sad',
    label: 'misses you',
    line: "I haven't seen a new word in a while...",
  },
  neutral: {
    key: 'neutral',
    label: 'is waiting',
    line: 'Ready to learn a word today?',
  },
  content: {
    key: 'content',
    label: 'is happy',
    line: 'Nice! Keep the words coming.',
  },
  happy: {
    key: 'happy',
    label: 'is thrilled',
    line: 'You hit your goal! I am so proud!',
  },
  sleepy: {
    key: 'sleepy',
    label: 'is napping',
    line: 'Zzz... wake me with a new word.',
  },
};
