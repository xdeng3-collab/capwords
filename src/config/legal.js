// ==================== Legal & support ====================
// The words here are a promise about what the app does with people's data.
// Change them together with the code they describe - see the notes in
// services/accountService.js (the progress mirror), api/deepseekClient.js
// (photo recognition) and features/capture/CameraScreen.js (location).

import { JOURNEY } from './journey';
import { REFERRAL } from './referral';

// Where "Contact us" goes. Empty hides the row until there is an address.
export const SUPPORT_EMAIL = '';

// Apple's standard licence agreement, which applies to apps that do not ship
// their own. App Review asks for a Terms of Use link next to subscriptions.
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

// Where to manage, cancel or ask for a refund on an App Store purchase.
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
export const REFUND_URL = 'https://reportaproblem.apple.com';

export const PRIVACY_UPDATED = 'October 24, 2026';

export const PRIVACY_SUMMARY = [
  'Your words, photos and voice recordings stay on your phone.',
  'To recognise an object, the photo you take is sent to DeepSeek, a third-party AI service, through Voyaword\' server, which does not store it - only after you agree.',
  'An account is optional. If you make one, your pals can see your name, @username, buddy, streak and word counts.',
  'No ads, no analytics or tracking tools, and we never sell your data.',
];

/** Each section: a heading and its paragraphs (strings) or bullet lists (arrays). */
export const PRIVACY_SECTIONS = [
  {
    title: 'What stays on your phone',
    body: [
      'Everything you make in Voyaword is stored only on this device:',
      [
        'your stickers - the photo, the word, its example sentence and fun fact',
        'where a photo was taken, if you allow location',
        'recordings of you practising a word',
        'your outfits, islands, coins, daily goal and streak (with an account, a copy of the numbers is kept for your pals - see below)',
      ],
      'Your words, photos and recordings are never stored on a server or backed up (a photo is only sent out to be recognised - see below). Deleting the app, or Me → "Erase everything on this phone", removes them for good.',
    ],
  },
  {
    title: 'Photos sent for recognition',
    body: [
      'When you take or choose a photo to learn a word, the image is sent to DeepSeek, a third-party AI service, which tells the app what the object is and writes the word, an example sentence and a fun fact. The photo passes through Voyaword\' server on its way to DeepSeek; the server does not store it.',
      'Voyaword asks for your permission before the first photo is sent, and you can turn this off in Me → App settings (you then cannot learn new words from photos).',
      'Voyaword does not keep the photo on any server. DeepSeek processes it under its own privacy policy. Please avoid photographing people, documents or anything private.',
      'To stop the service being overused, our server counts how many requests come from each account, or from each install and network address if you are not signed in. It keeps only a scrambled form of these, never the photo, and deletes the counts within two days.',
    ],
  },
  {
    title: 'Your account (optional)',
    body: [
      'You can use Voyaword without an account. An account lets you add pals and keep them if you change phones. It is stored with Supabase, our database host, and holds:',
      [
        'your email address, or your Apple ID if you use Sign in with Apple (Apple lets you hide your real email)',
        'your username and display name',
        'the numbers pals can see: current and best streak, words today and in total, coins, learning language, daily goal, and your buddy’s name, species and outfit',
        'your pals, pal requests and cheers',
        'your invite code, who invited you, and who joined with your code',
      ],
      'Your words and photos are never part of your account.',
    ],
  },
  {
    title: 'Invites',
    body: [
      `Invite rewards are for new pals. To tell a new phone from one that already has a Voyaword account, the app keeps a random marker in this phone’s keychain and sends it when you are signed in. It is not your phone’s serial number or advertising ID, and our server stores only a scrambled form of it, next to the accounts it was signed in to.`,
      'The marker stays in the keychain if you delete the app, and the scrambled form stays on our server if you delete your account, so that the same phone cannot claim a new-pal reward twice. It is used for nothing else.',
      `When someone joins with your code, the two of you become pals and each get ${REFERRAL.rewardDays} days of Pro.`,
      'If you pay for Pro, the app also sends the start and end dates of your current App Store period (never your payment details), so your invite days can wait until it ends.',
    ],
  },
  {
    title: 'Who can see what',
    body: [
      'Your pals can see your display name, @username, buddy, streaks and word counts.',
      'Anyone signed in can find you by name or @username and see your name, @username, buddy, current streak and words today, so they can send a pal request. They cannot see your words, photos or location.',
    ],
  },
  {
    title: 'Location, camera, microphone and photos',
    body: [
      'Voyaword asks iOS for permission before using any of these, and you can change your answer any time in iPhone Settings → Voyaword.',
      [
        'Camera and Photos: to take or choose the picture you learn from.',
        'Microphone: to record yourself saying a word. Recordings stay on your phone.',
        'Location: to pin a sticker on your word map. It is stored on your phone only; iOS looks up the place name.',
      ],
    ],
  },
  {
    title: 'Purchases',
    body: [
      'Subscriptions are handled by Apple. We never see your payment details - only whether a plan is active.',
    ],
  },
  {
    title: 'What we do not do',
    body: [
      [
        'no ads',
        'no analytics, tracking or advertising tools',
        'no tracking you across other apps or websites',
        'no selling or renting of your data',
      ],
    ],
  },
  {
    title: 'Keeping and deleting your data',
    body: [
      'Your account data is kept until you delete your account. Me → "Delete my account" removes your account, username, pal links and cheers from our servers, and erases the data on this phone.',
      'Data is encrypted in transit, and our database only lets each person read their own account and their pals’ shared numbers.',
    ],
  },
  {
    title: 'Children',
    body: [
      'Voyaword is not directed to children under 13, and we do not knowingly collect personal information from them. If you think a child has made an account, contact us and we will delete it.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'If this policy changes, we will update the date above and, for important changes, tell you in the app.',
    ],
  },
];

/** Help & support: questions, answered. */
export const HELP_FAQ = [
  {
    q: 'How do I learn a new word?',
    a: 'Tap SNAP, point the camera at something and tap the yellow button. Or tap PHOTOS to pick a picture you already have. Voyaword tells you the word in the language you are learning and saves it as a sticker.',
  },
  {
    q: 'Why can I only learn 3 words a day?',
    a: 'That is the free plan. Pro lifts the limit, so you can learn as many words a day as you like and set a bigger daily goal.',
  },
  {
    q: 'How do invites work?',
    a: `Open Me → Invite pals and share your code. When a friend makes a new Voyaword account with it, within ${REFERRAL.redeemWindowDays} days of signing up, you both get ${REFERRAL.rewardDays} days of Pro and become pals. It has to be a phone that has not been signed in to another Voyaword account. Invite days add up, up to ${REFERRAL.maxBankedDays} days ahead. If you already pay for Pro, they start when your paid period ends, so your membership lasts longer.`,
  },
  {
    q: 'How do streaks and islands work?',
    a: `Meet your daily goal to grow your streak; miss a day and it starts again. Every day you meet your goal also earns an island on Home, and those you keep for good. A day counts on the day itself, so changing your goal later does not add or remove islands. Every ${JOURNEY.milestoneEvery}th island is a milestone: your buddy wears a golden halo for ${JOURNEY.haloDays} days.`,
  },
  {
    q: 'Where are my photos and words?',
    a: 'Only on this phone. They are not backed up to our servers, so deleting the app removes them.',
  },
  {
    q: 'How do I add pals?',
    a: 'Sign in from Me, then open PALS and search for a name or @username. Once they accept, you can cheer each other on.',
  },
  {
    q: 'How do I manage or cancel my subscription?',
    a: 'Subscriptions are handled by Apple: open iPhone Settings → your name → Subscriptions → Voyaword. On a new phone, tap Restore purchases on the Upgrade page.',
  },
  {
    q: 'How do I get a refund?',
    a: 'Apple handles refunds for App Store purchases. Request one at reportaproblem.apple.com.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Me and scroll to the bottom: "Delete my account" removes your account and its data from our servers.',
  },
];
