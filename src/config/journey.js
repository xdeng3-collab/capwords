// ==================== The journey ====================
// One island for every day the daily goal is met (see progressService). Every
// `milestoneEvery`-th island is a milestone: the buddy wears a halo for
// `haloDays` days, counting the day it lands, and COINS.milestoneBonus is paid.
export const JOURNEY = {
  milestoneEvery: 50,
  haloDays: 7,
};

/**
 * The places the journey passes through, in order. `from` is the first island
 * of each place, so the buddy reaches a new one about once a week early on.
 *
 * This list is meant to grow: add new places to the END with a `from` past the
 * last one, plus their look in features/buddy/journey/seaArt.js (ZONE_ART,
 * keyed by `key`). Never reorder or re-space the places already shipped -
 * people would wake up somewhere else. A test checks every place has its art.
 *
 * `souvenir` (some places) is a local accessory the buddy wears on the map
 * while it is there. Buying it (a non-consumable, PRICING.souvenir) keeps it
 * as an outfit for good, and it can be bought later from the passport too;
 * its sprite is the outfit of the same id in components/pixel/PetSprite.js.
 *
 * `hello` is how people greet you there: the `word` as written locally, how
 * to say it in Latin letters when that differs, and `speak`, the speech
 * language that reads it aloud (null when phones have no voice for it).
 */
export const DESTINATIONS = [
  {
    key: 'cove',
    from: 0,
    name: 'Coconut Cove',
    region: 'Home port',
    about:
      "Your buddy's home beach, where every trip starts. Hit your daily goal and a new island rises out of the sea - keep going and it will carry you around the world.",
    facts: [
      'Every day you meet your goal earns one island. Missing a day never takes one away.',
      `Every ${JOURNEY.milestoneEvery}th island is a milestone - your buddy wears a golden halo for ${JOURNEY.haloDays} days.`,
      'New places are added to the map over time, so there is always somewhere further to go.',
    ],
    hello: null,
  },
  {
    key: 'reef',
    from: 7,
    name: 'Great Barrier Reef',
    region: 'Queensland, Australia',
    about:
      "The world's largest coral reef system, stretching about 2,300 km along Australia's north-east coast. Its warm, clear water is home to thousands of kinds of fish, turtles and corals.",
    facts: [
      'It is made of nearly 3,000 separate reefs and about 900 islands.',
      'Corals are animals, not plants: tiny polyps that build stony skeletons.',
      'It is so big that astronauts can see it from space.',
    ],
    hello: { word: "G'day!", language: 'Australian English', speak: 'en-AU' },
    souvenir: {
      id: 'snorkel',
      name: 'Snorkel mask',
      description: 'For spotting turtles on the reef.',
      productId: 'com.capwordsxxx.app.souvenir.snorkel',
    },
  },
  {
    key: 'santorini',
    from: 14,
    name: 'Santorini',
    region: 'Aegean Sea, Greece',
    about:
      'A ring of cliffs around a flooded volcano. White houses and blue domes cling to the edge, high above the sea, and the sunsets are famous all over the world.',
    facts: [
      'The island is the rim of a caldera left by a huge eruption about 3,600 years ago.',
      'Houses are painted white to reflect the hot summer sun and stay cool inside.',
      'Its beaches can be red, black or white, depending on the volcanic rock.',
    ],
    hello: { word: 'Γειά σου', romanized: 'Yiá sou', language: 'Greek', speak: 'el-GR' },
  },
  {
    key: 'amazon',
    from: 21,
    name: 'Amazon Rainforest',
    region: 'South America',
    about:
      'The largest tropical rainforest on Earth, spread across nine countries. A giant river winds through it, and the trees are so thick that the forest floor stays dim at noon.',
    facts: [
      'About one in ten known species on Earth lives here.',
      'The Amazon River carries more water than any other river in the world.',
      'Its trees release so much water vapour that the forest makes some of its own rain.',
    ],
    hello: { word: 'Olá!', language: 'Portuguese', speak: 'pt-BR' },
  },
  {
    key: 'sahara',
    from: 28,
    name: 'Sahara Desert',
    region: 'North Africa',
    about:
      'The largest hot desert in the world - nearly as big as the United States. Huge dunes roll for kilometres, and camels have carried travellers across it for centuries.',
    facts: [
      'Only about a quarter of the Sahara is sand dunes; most of it is rock and gravel.',
      "A camel's hump stores fat for energy, not water.",
      'Some dunes are taller than a 50-storey building.',
    ],
    hello: { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic', speak: 'ar-SA' },
  },
  {
    key: 'giza',
    from: 35,
    name: 'Pyramids of Giza',
    region: 'Cairo, Egypt',
    about:
      'Three great pyramids and the Sphinx stand at the edge of the desert. They were built as tombs for pharaohs about 4,500 years ago, without any modern machines.',
    facts: [
      'The Great Pyramid was the tallest building on Earth for about 3,800 years.',
      'It is the only one of the Seven Wonders of the Ancient World still standing.',
      'It is made of more than two million stone blocks.',
    ],
    hello: { word: 'أهلاً', romanized: 'Ahlan', language: 'Arabic', speak: 'ar-SA' },
    souvenir: {
      id: 'nemes',
      name: 'Pharaoh headdress',
      description: 'Striped in gold and blue, like a pharaoh.',
      productId: 'com.capwordsxxx.app.souvenir.nemes',
    },
  },
  {
    key: 'taj',
    from: 42,
    name: 'Taj Mahal',
    region: 'Agra, India',
    about:
      'A white marble tomb built by the emperor Shah Jahan in memory of his wife, Mumtaz Mahal. Its gardens and long reflecting pool make it look like it floats.',
    facts: [
      'It took about 20,000 workers around 20 years to build.',
      'The marble seems to change colour: pinkish at dawn, white at noon, golden by moonlight.',
      'The four towers lean slightly outwards, so they would fall away from the tomb.',
    ],
    hello: { word: 'नमस्ते', romanized: 'Namaste', language: 'Hindi', speak: 'hi-IN' },
  },
  {
    key: 'greatwall',
    from: 50,
    name: 'Great Wall of China',
    region: 'Northern China',
    about:
      'A chain of walls, towers and forts that snakes over mountains and deserts. It was built and rebuilt for about 2,000 years to guard the old Chinese empires.',
    facts: [
      'All its branches together are more than 21,000 km long.',
      'Most of the wall you can visit today was built during the Ming dynasty.',
      'Despite the myth, you cannot see it from the Moon with your eyes alone.',
    ],
    hello: { word: '你好', romanized: 'Nǐ hǎo', language: 'Chinese', speak: 'zh-CN' },
  },
  {
    key: 'fuji',
    from: 60,
    name: 'Mount Fuji',
    region: 'Honshu, Japan',
    about:
      "Japan's highest mountain: a near-perfect snowy cone you can see from Tokyo on a clear day. In spring, cherry blossoms frame it from the lakes below.",
    facts: [
      'It is 3,776 m tall.',
      'It is a volcano - it last erupted in 1707.',
      'Hundreds of thousands of people climb it every summer, many to watch the sunrise.',
    ],
    hello: { word: 'こんにちは', romanized: 'Konnichiwa', language: 'Japanese', speak: 'ja-JP' },
    souvenir: {
      id: 'kasa',
      name: 'Kasa straw hat',
      description: 'A wide straw hat for the climb up Fuji.',
      productId: 'com.capwordsxxx.app.souvenir.kasa',
    },
  },
  {
    key: 'kilauea',
    from: 70,
    name: 'Kīlauea Volcano',
    region: "Hawai'i, USA",
    about:
      'One of the most active volcanoes on Earth. Glowing lava lakes, steaming cracks and fresh black rock make it feel like the planet is still being built - because it is.',
    facts: [
      "When lava reaches the sea it cools into new land, so the Big Island is still growing.",
      'Hawaiian stories say Pele, goddess of fire, lives in its crater.',
      'Thin strands of cooled lava are called "Pele\'s hair".',
    ],
    hello: { word: 'Aloha!', language: 'Hawaiian', speak: null },
    souvenir: {
      id: 'lei',
      name: 'Flower lei',
      description: 'A garland of flowers to say aloha.',
      productId: 'com.capwordsxxx.app.souvenir.lei',
    },
  },
  {
    key: 'forbidden',
    from: 80,
    name: 'Forbidden City',
    region: 'Beijing, China',
    about:
      'The palace of the Ming and Qing emperors, hidden behind red walls and a moat. Ordinary people were not allowed in for almost 500 years - hence the name.',
    facts: [
      'It is the largest palace complex in the world, with about 980 buildings.',
      '24 emperors lived here.',
      'Yellow roofs were for the emperor only. Today it is the Palace Museum.',
    ],
    hello: {
      word: '欢迎',
      romanized: 'Huānyíng',
      meaning: 'Welcome',
      language: 'Chinese',
      speak: 'zh-CN',
    },
  },
  {
    key: 'galapagos',
    from: 90,
    name: 'Galápagos Islands',
    region: 'Pacific Ocean, Ecuador',
    about:
      'Volcanic islands far out in the Pacific, full of animals found nowhere else. The wildlife is so unafraid of people that sea lions nap on the benches.',
    facts: [
      'Giant tortoises here can live for more than 100 years.',
      'Marine iguanas are the only lizards in the world that swim and feed in the sea.',
      "Charles Darwin's visit in 1835 helped inspire his theory of evolution.",
    ],
    hello: { word: '¡Hola!', language: 'Spanish', speak: 'es-ES' },
  },
  {
    key: 'machu',
    from: 100,
    name: 'Machu Picchu',
    region: 'Andes, Peru',
    about:
      'An Inca citadel built high on a mountain ridge in the 1400s, about 2,430 m above sea level. Stone terraces step down the slopes, and clouds often drift between the peaks.',
    facts: [
      'Its stones fit so tightly, without mortar, that a knife blade cannot slip between them.',
      'Llamas and alpacas still graze on the terraces.',
      'It was named one of the New Seven Wonders of the World in 2007.',
    ],
    hello: {
      word: 'Allillanchu',
      meaning: 'Hello, how are you?',
      language: 'Quechua',
      speak: null,
    },
    souvenir: {
      id: 'chullo',
      name: 'Chullo hat',
      description: 'A warm Andean knit hat with ear flaps.',
      productId: 'com.capwordsxxx.app.souvenir.chullo',
    },
  },
  {
    key: 'canyon',
    from: 110,
    name: 'Grand Canyon',
    region: 'Arizona, USA',
    about:
      'A gigantic gorge carved by the Colorado River. Its walls are striped red, orange and cream, and each stripe is a different chapter of Earth\'s history.',
    facts: [
      'It is about 446 km long and up to 1.8 km deep.',
      'Its oldest rocks are almost 2 billion years old.',
      'The bottom can be more than 10 °C warmer than the rim.',
    ],
    hello: { word: 'Howdy!', language: 'American English', speak: 'en-US' },
    souvenir: {
      id: 'cowboy',
      name: 'Cowboy hat',
      description: 'Shade for a sunny day at the canyon rim.',
      productId: 'com.capwordsxxx.app.souvenir.cowboy',
    },
  },
  {
    key: 'whitehouse',
    from: 120,
    name: 'The White House',
    region: 'Washington, D.C., USA',
    about:
      'The home and office of the President of the United States. In spring the city around it turns pink with cherry blossoms, a gift from Japan in 1912.',
    facts: [
      'Every president since John Adams in 1800 has lived here.',
      'It has 132 rooms and 35 bathrooms.',
      'It takes about 570 gallons of paint to cover the outside.',
    ],
    hello: { word: 'Hello!', language: 'English', speak: 'en-US' },
  },
  {
    key: 'eiffel',
    from: 130,
    name: 'Eiffel Tower',
    region: 'Paris, France',
    about:
      'An iron lattice tower built for the 1889 World\'s Fair. Many Parisians hated it at first; now it is the symbol of the city and sparkles with lights every night.',
    facts: [
      'It was only meant to stand for 20 years.',
      'It is about 330 m tall and grows around 15 cm in summer as the iron warms up.',
      'It is repainted by hand about every seven years.',
    ],
    hello: { word: 'Bonjour !', language: 'French', speak: 'fr-FR' },
    souvenir: {
      id: 'beret',
      name: 'Beret',
      description: 'A soft beret for a walk along the Seine.',
      productId: 'com.capwordsxxx.app.souvenir.beret',
    },
  },
  {
    key: 'venice',
    from: 140,
    name: 'Venice',
    region: 'Veneto, Italy',
    about:
      'A city built on a lagoon, where canals take the place of streets. People get around on foot, by water bus and by gondola.',
    facts: [
      'It is built on more than 100 small islands.',
      'It has over 400 bridges and not a single car road through the old city.',
      'Much of it stands on wooden piles driven into the mud centuries ago.',
    ],
    hello: { word: 'Ciao!', language: 'Italian', speak: 'it-IT' },
    souvenir: {
      id: 'boater',
      name: 'Gondolier hat',
      description: 'A straw boater with a red ribbon.',
      productId: 'com.capwordsxxx.app.souvenir.boater',
    },
  },
  {
    key: 'glacier',
    from: 150,
    name: 'Glacier Bay',
    region: 'Alaska, USA',
    about:
      'A bay of fjords and tidewater glaciers. Huge chunks of ice crack off into the sea with a roar, and whales, seals and bears live along the shore.',
    facts: [
      'About 250 years ago the whole bay was covered by one sheet of ice.',
      'When ice breaks off a glacier into the sea it is called calving.',
      'Humpback whales come back every summer to feed.',
    ],
    hello: null,
  },
  {
    key: 'antarctica',
    from: 160,
    name: 'Antarctica',
    region: 'The South Pole',
    about:
      'The coldest, windiest and driest continent. Nobody lives here for good - only scientists at research stations, and millions of penguins.',
    facts: [
      'Its ice sheet holds about 70% of all the fresh water on Earth.',
      'The coldest temperature ever measured, about -89 °C, was recorded here.',
      'Emperor penguin dads keep their egg warm on their feet all winter.',
    ],
    hello: null,
    souvenir: {
      id: 'bobble',
      name: 'Bobble hat',
      description: 'A cosy knit hat for the coldest place on Earth.',
      productId: 'com.capwordsxxx.app.souvenir.bobble',
    },
  },
  {
    key: 'aurora',
    from: 170,
    name: 'Northern Lights',
    region: 'Iceland',
    about:
      'On long winter nights, green and purple lights dance across the sky over grass-roofed houses. Iceland is one of the best places on Earth to see them.',
    facts: [
      'Auroras glow when particles from the Sun hit gases high up in the air.',
      'Green, the most common colour, comes from oxygen about 100-300 km up.',
      'In the far south the same lights are called the Southern Lights.',
    ],
    hello: { word: 'Góðan daginn', meaning: 'Good day', language: 'Icelandic', speak: null },
  },
];
