// The promo images: App Store screenshots and social covers.
// `node marketing/render.js` turns each entry into a PNG in marketing/out/.
// Screens are simulator captures in marketing/screens/ (iPhone 17 Pro).

const SIZES = {
  appstore: { width: 1290, height: 2796 }, // 6.7" / 6.9" iPhone set
  xhs: { width: 1080, height: 1440 }, // Xiaohongshu 3:4 cover
};

const FRAMES = [
  {
    file: 'appstore-1-snap',
    size: 'appstore',
    theme: 'sea',
    kicker: 'SNAP ANYTHING',
    title: 'Point. Snap.\nLearn its name.',
    screen: 'sticker.png',
  },
  {
    file: 'appstore-2-journey',
    size: 'appstore',
    theme: 'sand',
    kicker: 'DAILY GOAL',
    title: 'Hit your goal,\nsail to a new island',
    screen: 'home.png',
  },
  {
    file: 'appstore-3-review',
    size: 'appstore',
    theme: 'leaf',
    kicker: 'SMART REVIEW',
    title: 'Words come back\nbefore you forget',
    screen: 'review.png',
  },
  {
    file: 'appstore-4-world',
    size: 'appstore',
    theme: 'sun',
    kicker: '20 REAL PLACES',
    title: 'From the Reef\nto the Pyramids',
    // The guide only shows places already reached, so show the whole route.
    art: 'marketing/screens/places.png',
    artRatio: 1078 / 1340,
    note: 'A new island every day you hit your goal',
    scene: 'marketing/screens/buddy-goal.png',
  },
  {
    file: 'appstore-5-share',
    size: 'appstore',
    theme: 'berry',
    kicker: 'SHARE THE TRIP',
    title: 'Post every word\nyou pick up',
    screen: 'share.png',
  },
  {
    file: 'appstore-6-say',
    size: 'appstore',
    theme: 'sea',
    kicker: 'LISTEN & RECORD',
    title: 'Hear it.\nSay it back.',
    screen: 'record.png',
  },
  {
    file: 'xhs-cover',
    size: 'xhs',
    theme: 'sea',
    kicker: 'VOYAWORD',
    title: '拍照学单词\n宠物带你环游世界',
    screen: 'home.png',
    secondScreen: 'sticker.png',
  },
];

module.exports = { SIZES, FRAMES };
