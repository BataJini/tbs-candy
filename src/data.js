// data.js — all the content: candies, NPCs, missions, tag spots, loot, endings.
// Every candy is 100% fictional sugar. Every NPC is 100% fictional weirdo.

export const CANDIES = {
  'acid-pear': { name: 'ACID PEAR DROP', desc: 'Tastes like a pear that saw things.', col: '#3dfc7a' },
  'bass-mint': { name: 'BASS MINT', desc: 'Freshens breath. Loosens kneecaps.', col: '#3aa0ff' },
  'neon-churchkhela': { name: 'NEON CHURCHKHELA', desc: 'Traditional walnut candle, but radioactive-looking.', col: '#ff4fa3' },
  'static-gum': { name: 'STATIC GUM', desc: 'Chew it near a radio and hear secrets.', col: '#cccccc' },
  'sub-lolly': { name: 'SUBWOOFER LOLLIPOP', desc: 'You do not lick it. It licks the room.', col: '#ffe93c' },
  'cola-candy': { name: 'BLACK SEA COLA CANDY', desc: 'Flat since 1987. Perfect.', col: '#6a4030' },
  'fish-gummy': { name: 'FISH GUMMY', desc: 'The cats know what this is. Do you?', col: '#7ac0d0' },
  'iron-mint': { name: 'IRON MINT', desc: 'A mint with teeth.', col: '#8a8a92' },
  'battery-taffy': { name: 'BATTERY TAFFY', desc: '9 volts of chew.', col: '#c0a030' },
  'sunflower-brittle': { name: 'SUNFLOWER BRITTLE', desc: 'Grandpa fuel. Crunchy wisdom.', col: '#d0a040' },
  'copper-worm': { name: 'COPPER SOUR WORM', desc: 'Conducts flavor AND electricity.', col: '#c07030' },
};

// world candy pickups: [candyId, x, y, z]
export const CANDY_PICKUPS = [
  ['fish-gummy', -77, 0.4, -30], ['fish-gummy', -76.5, 0.4, 25], ['fish-gummy', -77.5, -2.4, 55],
  ['sunflower-brittle', 32.5, 22.8, -40],
  ['acid-pear', -2, 0.4, 32.5],
  ['cola-candy', -33, 5.6, -16], ['cola-candy', -100, 6.7, 65],
  ['acid-pear', 43, 0.4, -64], ['neon-churchkhela', -8, -59.4, 92.5],
  ['cola-candy', -61, -39.4, 82],
];

// vending machines: press E, pick a candy
export const VENDING = [
  { pos: [-40, 0, 34.2], items: ['static-gum', 'cola-candy'] },
  { pos: [55, 0, 27.2], items: ['static-gum', 'cola-candy', 'acid-pear'] },
];

/* ---------------- TAG SPOTS ---------------- */
// {id, pos, face, w, h} — face is the wall normal
export const TAG_SPOTS = [
  // underpass (8)
  { id: 'u1', pos: [-31.25, 2.0, -10], face: '-x', w: 1.6, h: 1.6 },
  { id: 'u2', pos: [-31.25, 2.2, 33], face: '-x', w: 1.6, h: 1.6 },
  { id: 'u3', pos: [-44, 1.6, -4.68], face: '-z', w: 1.1, h: 1.4 },
  { id: 'u4', pos: [-36, 1.6, 16.68], face: '+z', w: 1.1, h: 1.4 },
  { id: 'u5', pos: [-79.25, -1.4, -20], face: '-x', w: 1.6, h: 1.4 },
  { id: 'u6', pos: [-38, 5.22, 0], face: '+y', w: 2, h: 2 },
  { id: 'u7', pos: [-62.25, 1.4, -2], face: '+x', w: 1.2, h: 1.2 },
  { id: 'u8', pos: [-33, 2.5, -25.32], face: '-z', w: 1.6, h: 1.2 },
  // old blocks (8)
  { id: 'o1', pos: [20, 3, -32.9], face: '+z', w: 2, h: 2 },
  { id: 'o2', pos: [37.9, 4, -40], face: '-x', w: 2, h: 2 },
  { id: 'o3', pos: [70, 5, -52.15], face: '-z', w: 2, h: 2 },
  { id: 'o4', pos: [14, 1.4, -55.45], face: '+z', w: 1.6, h: 1.4 },
  { id: 'o5', pos: [37.15, 6, -75], face: '+x', w: 2, h: 2 },
  { id: 'o6', pos: [20, 20.65, -40], face: '+y', w: 2, h: 2 },
  { id: 'o7', pos: [64, 31.9, -75.35], face: '+z', w: 1.4, h: 1.2 },
  { id: 'o8', pos: [42, 1.2, -61.8], face: '+z', w: 1.6, h: 1 },
  // rustaveli (8)
  { id: 'r1', pos: [-10, 2.8, 4.15], face: '+z', w: 2, h: 2 },
  { id: 'r2', pos: [18, 2.8, 2.15], face: '+z', w: 2, h: 2 },
  { id: 'r3', pos: [50, 2.8, 3.15], face: '+z', w: 2, h: 2 },
  { id: 'r4', pos: [34, 1.5, 18.58], face: '+z', w: 1.8, h: 1.4 },
  { id: 'r5', pos: [1.05, 1.8, 27], face: '+x', w: 1.6, h: 1.6 },
  { id: 'r6', pos: [66.45, 8, 28], face: '+x', w: 2.2, h: 2.2 },
  { id: 'r7', pos: [-18, 1.6, 22.4], face: '-z', w: 1.8, h: 1.2 },
  { id: 'r8', pos: [78, 2.8, 4.15], face: '+z', w: 2, h: 2 },
  // club district (10, incl club bathrooms)
  { id: 'c1', pos: [-5.1, 3, 80], face: '-x', w: 2.2, h: 2.2 },
  { id: 'c2', pos: [25.1, 3, 80], face: '+x', w: 2.2, h: 2.2 },
  { id: 'c3', pos: [-68, 2, 61.4], face: '-z', w: 2, h: 1.8 },
  { id: 'c4', pos: [-90, 3, 63.1], face: '+z', w: 1.4, h: 1.6 },
  { id: 'c5', pos: [34, 1.5, 71.6], face: '+z', w: 1.6, h: 1.4 },
  { id: 'c6', pos: [-83, 6.32, 68], face: '+y', w: 2.2, h: 2.2 },
  { id: 'c7', pos: [-8, -58.8, 91.2], face: '-z', w: 1.6, h: 1.4 },
  { id: 'c8', pos: [0.3, -58.8, 90], face: '+x', w: 1.4, h: 1.4 },
  { id: 'c9', pos: [-60.5, -38.6, 83.25], face: '-z', w: 1.6, h: 1.4 },
  { id: 'c10', pos: [-90, -38.8, 54.8], face: '+z', w: 1.6, h: 1.4 },
  // rooftops (6)
  { id: 't1', pos: [60, 31.9, -81.6], face: '+z', w: 1.6, h: 1.2 },
  { id: 't2', pos: [73.75, 29.7, -40.35], face: '+z', w: 1.4, h: 1.2 },
  { id: 't3', pos: [70.05, 29.5, -80], face: '-x', w: 1.4, h: 1.4 },
  { id: 't4', pos: [41.5, 25, -42.15], face: '+z', w: 1.2, h: 1 },
  { id: 't5', pos: [64, 30.95, -81], face: '+y', w: 1.6, h: 1.6 },
  { id: 't6', pos: [30, 22.65, -75], face: '+y', w: 2, h: 2 },
];

// murals: need 1 rare cap each, bigger, louder
export const MURALS = [
  { id: 'm1', pos: [-31.25, 2.6, 26], face: '-x', w: 5.5, h: 2.8, name: 'UNDERPASS GOSPEL' },
  { id: 'm2', pos: [22.9, 11, -75], face: '-x', w: 6, h: 3, name: 'GABLE GIANT' },
  { id: 'm3', pos: [-74.1, 3, 68], face: '-x', w: 5, h: 2.6, name: 'BUNKER BLESSING' },
  { id: 'm4', pos: [40, -58.4, 69.35], face: '+z', w: 5, h: 2.5, name: 'STAFF ROOM SECRET' },
  { id: 'm5', pos: [28.15, 3.2, -4], face: '+x', w: 5, h: 3, name: 'GOV SIDE SCANDAL' },
];

/* ---------------- COLLECTIBLES ---------------- */
export const STICKERS = [
  { id: 's1', pos: [-90, 5.8, 62], hint: 'bridge pylon top' },
  { id: 's2', pos: [-64, 3.5, -2], hint: 'kiosk roof' },
  { id: 's3', pos: [16.5, 22, -43.5], hint: 'T1 rooftop vent' },
  { id: 's4', pos: [34, 7.6, 16], hint: 'monument crown' },
  { id: 's5', pos: [-9.5, -58.4, 93], hint: 'B909 bathroom stall' },
  { id: 's6', pos: [-91, -39, 58], hint: 'KHD stash room' },
  { id: 's7', pos: [58.6, 31.8, -85.2], hint: 'radio shack desk' },
  { id: 's8', pos: [-77.9, -2.6, 40.8], hint: 'river ladder' },
  { id: 's9', pos: [20.4, 3.2, -59], hint: 'garage roof' },
  { id: 's10', pos: [-18, 3.8, 24], hint: 'bus stop roof' },
];

export const CAPS = [
  { id: 'cap1', pos: [-33, 5.7, 36] },
  { id: 'cap2', pos: [67, 31.1, -78] },
  { id: 'cap3', pos: [-100, 6.7, 70] },
  { id: 'cap4', pos: [-7, -59.0, 71] },
];

export const MIXTAPES = [
  { id: 'mt1', pos: [-9, -58.9, 68], track: 'mix1', name: 'MIXTAPE: WET CONCRETE' },
  { id: 'mt3', pos: [-89, -39.1, 56.5], track: 'mix3', name: 'MIXTAPE: STASH DUB' },
  { id: 'mt5', pos: [61.4, 31.9, -85.2], track: 'mix5', name: 'MIXTAPE: ANTENNA GOSPEL' },
];
export const MIXTAPE_NAMES = {
  mix1: 'WET CONCRETE', mix2: 'BASS MINT CONDITION', mix3: 'STASH DUB',
  mix4: 'BUNKER TAPES VOL.404', mix5: 'ANTENNA GOSPEL'
};

export const PHOTO_CHALLENGES = [
  { id: 'p1', name: 'CONCRETE KHINKALI', desc: 'Shoot the monument', pos: [34, 4.6, 16], r: 22 },
  { id: 'p2', name: 'TOWER OF SIGNALS', desc: 'Shoot the TV tower', pos: [96, 50, -104], r: 70 },
  { id: 'p3', name: 'PROPAGANDA PIXEL', desc: 'Shoot a gov screen', pos: [30, 4.5, 23], r: 20 },
  { id: 'p4', name: 'EYE IN THE SKY', desc: 'Shoot a corporate drone up close', pos: null, r: 14, dynamic: 'drone' },
  { id: 'p5', name: 'STREET COUNCIL', desc: 'Shoot a stray cat', pos: null, r: 8, dynamic: 'cat' },
  { id: 'p6', name: 'GREEN CHURCH OF BASS', desc: 'Shoot the BASSMENT sign', pos: [10, 7.6, 90.3], r: 18 },
];

/* ---------------- NPCs ---------------- */
// {id, name, pos, yaw, seed, col, lines, special?}
// lines rotate on repeat talks. Mission dialogue lives in MISSIONS.
export const NPCS = [
  // — MTKVARI UNDERPASS —
  { id: 'zura', name: 'ZURA THE PLUG (OF FLYERS)', pos: [-50, 0, 10], yaw: 1.6, seed: 11, col: '#8a5a9a',
    lines: ['I PROMOTE EVENTS. LEGALLY. MOSTLY.', 'THE UNDERPASS IS A LOBBY. THE CITY IS THE CLUB.', 'YOU LOOK LIKE YOU CARRY THINGS. GOOD TRAIT.'] },
  { id: 'gio', name: 'GIO — KIOSK EMPEROR', pos: [-64.2, 0, -0.6], yaw: 3.14, seed: 12, col: '#5a7a9a',
    lines: ['24/7 MEANS I SLEEP STANDING.', 'I STOCK EVERYTHING EXCEPT HAPPINESS. TRY A CANDY.', 'NO REFUNDS. TIME IS A REFUND.'], special: 'kiosk' },
  { id: 'otar', name: 'OTAR — CHESS WARLORD', pos: [-70.8, 0, -11.2], yaw: 0.4, seed: 13, col: '#7a7a6a',
    lines: ['I BEAT THE RIVER AT CHESS ONCE.', 'YOUNG PEOPLE RUN EVERYWHERE. KNIGHTS MOVE IN L. BE A KNIGHT.', 'BRING SNACKS. WISDOM IS HUNGRY WORK.'] },
  { id: 'murman', name: 'MURMAN OF THE CAT COUNCIL', pos: [-46, 0, 28], yaw: -1.6, seed: 14, col: '#4a6a4a',
    lines: ['THE CATS VOTED. YOU MAY PASS.', 'EVERY CAT HERE IS A RETIRED DJ.', 'FEED THE COUNCIL. EARN THE COUNCIL.'] },
  { id: 'tazo', name: 'TAZO — RIVER PROPHET', pos: [-77, 0, -40], yaw: 1.2, seed: 15, col: '#5a6a7a',
    lines: ['I FISH FOR SIGNALS. THE FISH LEFT IN 1991.', 'THE MTKVARI KNOWS YOUR NAME. IT TOLD ME.', 'SOMETHING SHINY BY THE SOUTH LADDER. NOT TELLING TWICE.'] },
  { id: 'nika', name: 'NIKA (BATTERY: 4%)', pos: [-60, 0, 2.5], yaw: 2.4, seed: 16, col: '#9a5a5a',
    lines: ['I DANCED 14 HOURS. MY BONES ARE TECHNO NOW.', 'BASSMENT 909... THE BOUNCER IS A WALL WITH FEELINGS.', 'FIVE MORE MINUTES OF FLOOR. THEN I RAVE AGAIN.'] },
  // — OLD BLOCKS —
  { id: 'lamara', name: 'BEBIA LAMARA', pos: [36, 0, -56.8], yaw: 0, seed: 21, col: '#9a7a8a',
    lines: ['IN MY DAY GRAFFITI WAS CALLED HANDWRITING.', 'EAT SOMETHING. YOU ARE ALL ELBOWS.', 'THE ELEVATOR EATS PEOPLE. TAKE THE STAIRS, SHVILO.'] },
  { id: 'beso', name: 'BESO — ELEVATOR SHAMAN', pos: [67, 0, -76.5], yaw: 2.6, seed: 22, col: '#6a6a8a',
    lines: ['THE LIFT WORKS IF YOU BELIEVE. AND IF I KICK IT.', 'UP THERE? ANTENNAS, GHOSTS, GOOD RECEPTION.', 'I ONCE RODE THIS LIFT FOR A WEEK. GOOD WEEK.'] },
  { id: 'kera', name: 'KERA — WALL SURGEON', pos: [16, 0, -54], yaw: 0.6, seed: 23, col: '#5a9a7a',
    lines: ['YOUR CAN GAME IS BABY. BUT BABIES GROW.', 'REAL SPOTS NEED RARE CAPS. FIND THEM. EARN THEM.', 'PAINT FAST, LEAVE FASTER.'] },
  { id: 'gela', name: 'GELA — TRUTH ENJOYER', pos: [30, 0, -66.8], yaw: 0, seed: 24, col: '#8a8a5a',
    lines: ['CANDYCORP PUTS GRAY IN THE RAINBOW. WAKE UP.', 'THE DRONES COUNT YOUR TEETH. WHY? EXACTLY.', 'PHOTOGRAPH EVERYTHING. EVIDENCE IS FOREVER.'] },
  { id: 'ana', name: 'ANA — CLUB KID SUPREME', pos: [48, 0, -60.5], yaw: -0.8, seed: 25, col: '#c05a9a',
    lines: ['KHD-404 ONLY LETS IN PEOPLE WITH IRON IN THEIR SOUL.', 'MY OUTFIT IS 90% TAPE. FASHION.', 'SHORENA RESPECTS METAL. THINK ABOUT IT.'] },
  { id: 'luka', name: 'LUKA — GRAVITY DISRESPECTER', pos: [22, 20.6, -38], yaw: 2.2, seed: 26, col: '#5a8ac0',
    lines: ['THE ROOFS ARE A STREET NOBODY SWEEPS.', 'PLANKS CONNECT EVERYTHING. LIKE FRIENDSHIP. BUT WOOD.', 'IF YOU FALL, FALL WITH STYLE.'] },
  // — RUSTAVELI GLITCH —
  { id: 'vakho', name: 'VAKHO — TAXI PHILOSOPHER', pos: [-12.2, 0, 82.5], yaw: -1.2, seed: 31, col: '#9a9a5a',
    lines: ['I DRIVE NOWHERE. IT IS ALWAYS RUSH HOUR TO NOWHERE.', 'METER IS BROKEN. PAY ME IN GOSSIP.', 'THIS CITY HAS TWO SPEEDS: TRAFFIC AND TECHNO.'] },
  { id: 'elene', name: 'ELENE — COLOR WITCH', pos: [31, 0, 19.5], yaw: -0.4, seed: 32, col: '#c07a5a',
    lines: ['THE MONUMENT? I SEE A GIANT EAR. IT LISTENS.', 'GRAY IS NOT A COLOR. IT IS A THREAT.', 'PAINT THE BIG WALLS. THE SMALL ONES GOSSIP.'] },
  { id: 'zaza', name: 'ZAZA — PUNK LAUREATE', pos: [-4.5, 0, 29], yaw: 0.2, seed: 33, col: '#5a5a5a',
    lines: ['THE METRO IS SEALED BECAUSE IT PLAYED BETTER MUSIC.', 'AUTHORITY IS A FONT. CHANGE THE FONT.', 'I HAVE MINTS STRONGER THAN THE GOVERNMENT.'] },
  { id: 'grey', name: 'MR. GREY — DEFINITELY NORMAL', pos: [62, 0, 24], yaw: -2.4, seed: 34, col: '#8a8a92',
    lines: ['HELLO FELLOW STREET YOUTH. NICE WEATHER FOR COMPLIANCE.', 'I AM NOT FROM CANDYCORP. WHO SAID CANDYCORP?', 'MY TIE? STANDARD ISSUE. I MEAN, FASHION.'] },
  { id: 'tato', name: 'TATO — LIVING STATUE (ON BREAK)', pos: [18, 1.4, 5.8], yaw: 3.14, seed: 35, col: '#b0a890',
    lines: ['I STOOD STILL FOR 6 HOURS. THE PIGEONS UNIONIZED.', 'STILLNESS IS A DANCE AT 0 BPM.', 'THROW A COIN. OR A COMPLIMENT. COMPLIMENTS WEIGH LESS.'] },
  { id: 'sopo', name: 'SOPO — DRONE WATCHER', pos: [44, 0, 20], yaw: -2.8, seed: 36, col: '#7ac0c0',
    lines: ['THE DRONES GET ANGRY WHEN YOU PAINT. THEY LOVE GRAY.', 'IF YOUR HEAT MAXES OUT THEY JUST... BONK YOU. CARTOONISHLY.', 'I NAMED THAT ONE BUZZO. HE HATES ART THE MOST.'] },
  // — BRIDGE CLUB DISTRICT —
  { id: 'goga', name: 'GOGA — THE DOOR ITSELF', pos: [7, 0, 91], yaw: 3.14, seed: 41, col: '#4a4a6a', scale: 1.5,
    lines: ['LIST? YOU ARE NOT ON THE WALL EITHER.', 'I AM NOT SLEEPY. I AM CONSERVING RAGE.', 'THE BASS IS A PRIVILEGE, NOT A RIGHT.'] },
  { id: 'shorena', name: 'SHORENA — KHD GATEKEEPER', pos: [-61.5, 0, 69.3], yaw: 1.6, seed: 42, col: '#6a4a4a',
    lines: ['THIS IS NOT A CLUB. IT IS A PRESSURE CHAMBER.', 'DRESS CODE: CONCRETE.', 'BRING ME SOMETHING WITH TEETH AND WE TALK.'] },
  { id: 'tamta', name: 'TAMTA — QUEUE ROYALTY', pos: [26, 0, 86.2], yaw: -1.6, seed: 43, col: '#c08ab0',
    lines: ['I HAVE BEEN IN THIS QUEUE SINCE THURSDAY. IT IS ART.', 'THE NEON SIGN? VERY PHOTOGENIC. VERY.', 'INSIDE SMELLS LIKE FOG MACHINE AND DESTINY.'] },
];

export const NPCS_INSIDE = [
  // — BASSMENT 909 —
  { id: 'khinkali', name: 'DJ KHINKALI', pos: [10, -58.4, 66.5], yaw: 3.14, seed: 51, col: '#5ac08a',
    lines: ['I HAVE PLAYED 9 HOURS. MY WRIST IS A METRONOME NOW.', 'THE CROWD FEEDS ME. I FEED THE CROWD. ECOSYSTEM.', 'ONE DAY I DROP THE FINAL SET. NOT TODAY. UNLESS...'] },
  { id: 'nino', name: 'NINO — BAR ORACLE', pos: [28.5, -60, 76], yaw: -1.6, seed: 52, col: '#c05a5a',
    lines: ['WATER IS FREE. OPINIONS COST.', 'I HAVE SEEN THINGS AT THIS BAR. MOSTLY ELBOWS.', 'THE DJ RUNS ON MINTS. DO NOT ASK.'] },
  { id: 'keti', name: 'KETI — BATHROOM LINE VETERAN', pos: [-4, -60, 88], yaw: 2.4, seed: 53, col: '#c0a05a',
    lines: ['THE LINE IS THE REAL DANCE FLOOR.', 'I HAVE BEEN NEXT FOR 45 MINUTES. NEXT IS A LIFESTYLE.', 'I WOULD TRADE A KIDNEY FOR SOMETHING SWEET.'] },
  { id: 'dato', name: 'DATO — CHILL ROOM GURU', pos: [-8, -60, 73], yaw: 0.8, seed: 54, col: '#8a5ac0',
    lines: ['THE CHILL ROOM IS WHERE THE BASS COMES TO APOLOGIZE.', 'BREATHE IN FOUR BEATS. OUT FOUR BEATS. NOW YOU ARE A LOOP.', 'STAFF DOOR? ONLY FOR THOSE THE VIBE TRUSTS.'] },
  // — KHD-404 —
  { id: 'vinyl', name: 'DJ VINYL ERROR', pos: [-70, -38.6, 53.5], yaw: 3.14, seed: 61, col: '#5a6ac0',
    lines: ['MY DECKS RUN ON 9 VOLTS AND SPITE.', 'THIS BUNKER HAS PERFECT ACOUSTICS. AND ZERO EXITS. PERFECT.', 'I SAMPLE THE VENTILATION. TRACK 4 IS LITERALLY A FAN.'] },
  { id: 'rezo', name: 'REZO — HORIZONTAL PHILOSOPHER', pos: [-61, -40, 79], yaw: 1.6, seed: 62, col: '#c0705a',
    lines: ['I AM NOT LYING DOWN. I AM DANCING AT 0.25X SPEED.', 'THE CAGE IS A METAPHOR. ALSO A CAGE.', 'I COLLECT WORMS. SOUR ONES. COPPER ONES. ASK ME WHY. DO NOT.'] },
  { id: 'k9', name: 'K-9000 — BARTENDER UNIT', pos: [-79, -40, 73], yaw: 1.6, seed: 63, col: '#9aa0a8',
    lines: ['BEEP. YOUR HYDRATION LEVELS DISAPPOINT ME.', 'I MIX DRINKS AND METAPHORS. BOTH SERVED COLD.', 'ERROR 404: LAST ORDERS NOT FOUND. THE NIGHT IS INFINITE.'] },
  // — ROOFTOP —
  { id: 'data', name: 'DATA — PIRATE SIGNAL SAINT', pos: [60, 30.6, -82.6], yaw: 3.14, seed: 71, col: '#5ac0c0',
    lines: ['I BROADCAST TRUTH AT 3AM. AND CAT FACTS AT 4.', 'CANDYCORP JAMS MY SIGNAL. I JAM THEIR VIBE.', 'THE ANTENNA HEARS EVERYTHING. MOSTLY TECHNO.'] },
];

export const CATS = [
  { id: 'cat1', pos: [-58, 0, 18] }, { id: 'cat2', pos: [-72, 0, 30] },
  { id: 'cat3', pos: [-64, 0, -6.5] }, { id: 'cat4', pos: [43, 0, -58.5] },
  { id: 'cat5', pos: [26, 0, 84] }, { id: 'cat6', pos: [60, 30.9, -82] },
];

/* ---------------- CANDY DELIVERY MISSIONS ---------------- */
// giver offers, source provides the candy (npc id, 'kiosk', 'vending' or 'pickup'),
// target receives. reward: rep/vibe/cap/mixtape/pass/flag/upgrade.
export const MISSIONS = [
  { id: 'm-goga', name: 'THE WALL MUST CHEW', candy: 'sub-lolly', qty: 1, giver: 'zura', target: 'goga', source: 'zura',
    offer: ['GOGA AT BASSMENT WON\'T LET ANYONE IN. HE\'S TIRED.', 'TAKE HIM THIS SUBWOOFER LOLLIPOP. IT SPEAKS HIS LANGUAGE.'],
    deliver: ['...THIS LOLLIPOP UNDERSTANDS ME.', 'FINE. YOU\'RE ON THE WALL NOW. THE GOOD WALL. THE LIST.'],
    reward: { rep: 15, pass: 'b909' }, hint: 'Deliver the SUBWOOFER LOLLIPOP to GOGA at BASSMENT 909' },
  { id: 'm-khinkali', name: 'MINT CONDITION', candy: 'bass-mint', qty: 1, giver: 'khinkali', target: 'khinkali', source: 'nino',
    offer: ['MY SET IS DYING. I NEED A BASS MINT.', 'NINO AT THE BAR HOARDS THEM. GO. THE CROWD DEPENDS ON DENTAL FRESHNESS.'],
    deliver: ['*CHOMP* ... YES. THE KNEECAPS ARE LOOSE. THE SET LIVES.'],
    reward: { rep: 20, mixtape: 'mix2' }, hint: 'Get a BASS MINT from NINO, give it to DJ KHINKALI' },
  { id: 'm-keti', name: 'SWEET RELIEF', candy: 'neon-churchkhela', qty: 1, giver: 'keti', target: 'keti', source: 'kiosk',
    offer: ['IF I LEAVE THE LINE I LOSE MY SPOT. IF I STAY I LOSE MY MIND.', 'BRING ME A NEON CHURCHKHELA. GIO SELLS THEM. RUN, HERO.'],
    deliver: ['GLOWING WALNUTS... THE LINE MEANS NOTHING NOW.'],
    reward: { vibe: 20, cap: 1 }, hint: 'Buy NEON CHURCHKHELA at the kiosk, deliver to KETI in the B909 bathroom line' },
  { id: 'm-data1', name: 'CHEW THE SIGNAL', candy: 'static-gum', qty: 1, giver: 'data', target: 'data', source: 'vending',
    offer: ['MY TEETH ARE THE ANTENNA. I NEED STATIC GUM.', 'THE CANDY-O-MAT UNDER THE ROAD STOCKS IT. GO CHEW-WARD.'],
    deliver: ['*BZZT* ... I CAN HEAR THE WEATHER IN BULGARIA. PERFECT.'],
    reward: { rep: 25, flag: 'radioFriend' }, hint: 'Buy STATIC GUM from a CANDY-O-MAT, bring it to DATA on the radio roof' },
  { id: 'm-lamara', name: 'PEAR PRESSURE', candy: 'acid-pear', qty: 1, giver: 'lamara', target: 'lamara', source: 'kiosk',
    offer: ['SHVILO, MY SWEET TOOTH REMEMBERS 1975.', 'FETCH ME AN ACID PEAR DROP. THE GREEN ONE. THE LOUD ONE.'],
    deliver: ['OH! IT TASTES LIKE MY YOUTH. ILLEGAL AMOUNTS OF FLAVOR.'],
    reward: { rep: 15 }, hint: 'Bring BEBIA LAMARA an ACID PEAR DROP from the kiosk' },
  { id: 'm-vakho', name: 'FLAT IS BEAUTIFUL', candy: 'cola-candy', qty: 2, giver: 'vakho', target: 'vakho', source: 'vending',
    offer: ['TWO BLACK SEA COLA CANDIES. ONE FOR ME. ONE FOR THE CAR.', 'THE CAR EATS FIRST. HOUSE RULES.'],
    deliver: ['THE CAR IS PURRING. THAT\'S EITHER JOY OR THE ENGINE. RUMOR: THERE\'S A VENT INSIDE KHD. CRAWL IT.'],
    reward: { rep: 15, flag: 'ventRumor' }, hint: 'Bring VAKHO two BLACK SEA COLA CANDIES (vending machines)' },
  { id: 'm-shorena', name: 'IRON DIPLOMACY', candy: 'iron-mint', qty: 1, giver: 'shorena', target: 'shorena', source: 'zaza',
    offer: ['ENTRY COSTS METAL. BRING ME AN IRON MINT.', 'THE PUNK AT THE METRO CARRIES THEM. TELL HIM THE BUNKER SAYS HI.'],
    deliver: ['*CRUNCH* ... ADEQUATE VIOLENCE. ENTER THE PRESSURE CHAMBER.'],
    reward: { rep: 15, pass: 'khd' }, hint: 'Get an IRON MINT from ZAZA, give it to SHORENA at KHD-404' },
  { id: 'm-murman', name: 'COUNCIL TRIBUTE', candy: 'fish-gummy', qty: 3, giver: 'murman', target: 'murman', source: 'pickup',
    offer: ['THE COUNCIL DEMANDS THREE FISH GUMMIES.', 'THE RIVER EDGE HIDES THEM. THE CATS ALREADY KNOW. BE FASTER THAN CATS.'],
    deliver: ['THE COUNCIL PURRS. YOU ARE NOW 4% CAT. TAKE THIS RARE CAP.'],
    reward: { rep: 10, cap: 1 }, hint: 'Find 3 FISH GUMMIES along the river, bring them to MURMAN' },
  { id: 'm-vinyl', name: '9 VOLT COMMUNION', candy: 'battery-taffy', qty: 1, giver: 'vinyl', target: 'vinyl', source: 'beso',
    offer: ['MY DECKS ARE DYING. BATTERY TAFFY. NOW.', 'BESO THE ELEVATOR GUY CHEWS THEM FOR BREAKFAST. NEGOTIATE.'],
    deliver: ['*BZZZT* THE DECKS LIVE. THE BUNKER THANKS YOU. TAKE THIS TAPE.'],
    reward: { rep: 20, mixtape: 'mix4', flag: 'vinylFriend' }, hint: 'Get BATTERY TAFFY from BESO, deliver to DJ VINYL ERROR in KHD' },
  { id: 'm-elene', name: 'TASTE THE PALETTE', candy: 'acid-pear', qty: 1, giver: 'elene', target: 'elene', source: 'kiosk',
    offer: ['I PAINT WHAT I TASTE. BRING ME AN ACID PEAR DROP.', 'MY LAST MURAL WAS SPONSORED BY A SANDWICH.'],
    deliver: ['MMM. I SEE... GREEN. EVERYWHERE. TAKE THIS CAP — PAINT SOMETHING HUGE.'],
    reward: { rep: 10, cap: 1 }, hint: 'Bring ELENE an ACID PEAR DROP' },
  { id: 'm-grey', name: 'THE DEFECTOR\'S TOOTH', candy: 'neon-churchkhela', qty: 1, giver: 'grey', target: 'grey', source: 'kiosk',
    offer: ['HYPOTHETICALLY. IF A CANDYCORP AGENT WANTED REAL CANDY. HYPOTHETICALLY.', 'A NEON CHURCHKHELA. FOR RESEARCH. PLEASE HURRY, THEY MONITOR MY LUNCH.'],
    deliver: ['*QUIET CRUNCHING* ... IT IS BEAUTIFUL. HERE. AN INTERNAL MEMO. USE IT. I WAS NEVER HERE.'],
    reward: { rep: 10, flag: 'evidence2' }, hint: 'Feed MR. GREY a NEON CHURCHKHELA. For research.' },
  { id: 'm-data2', name: 'WORM THE AERIAL', candy: 'copper-worm', qty: 1, giver: 'data', target: 'data', source: 'rezo', requires: 'radioFriend',
    offer: ['THE TRANSMITTER NEEDS A COPPER SOUR WORM. DO NOT ASK. IT CONDUCTS.', 'REZO IN THE KHD CAGE COLLECTS THEM. HORIZONTAL GUY. VERY WISE.'],
    deliver: ['*ZAP* SIGNAL AT FULL POWER. THE TRUTH HAS A FREQUENCY NOW.'],
    reward: { rep: 20, flag: 'radioOnline' }, hint: 'Get a COPPER SOUR WORM from REZO, bring it to DATA' },
  { id: 'm-otar', name: 'BRITTLE GAMBIT', candy: 'sunflower-brittle', qty: 1, giver: 'otar', target: 'otar', source: 'pickup',
    offer: ['BRING ME SUNFLOWER BRITTLE AND I TEACH YOU THE GOAT STEP.', 'LAST BAG IN THE CITY SITS ON A PLANK BETWEEN ROOFS. THE PIGEONS GUARD IT.'],
    deliver: ['HA! THE GOAT STEP IS YOURS. JUMP LIKE RENT IS DUE.'],
    reward: { rep: 10, upgrade: 'moves' }, hint: 'Fetch the SUNFLOWER BRITTLE from the rooftop plank for OTAR' },
];

/* ---------------- ENDINGS ---------------- */
export const ENDINGS = {
  end1: {
    title: 'KING OF TAGS', sub: 'ENDING 1 OF 3',
    body: 'Every wall in the city carries your mark. The pigeons salute. The grandmas nod. Kera repaints her own tag smaller, out of respect. Tonight, from the antenna roof, the whole city looks like your sketchbook — because it is.',
  },
  end2: {
    title: 'BASS ASCENSION', sub: 'ENDING 2 OF 3',
    body: 'The final set. The floor of BASSMENT 909 becomes one organism with 400 knees. DJ Khinkali hands you the headphones and whispers: "the bass was inside you all along." You play until the sun apologizes for rising.',
  },
  end3: {
    title: 'SYSTEM CRASH', sub: 'ENDING 3 OF 3',
    body: 'At 3:33 AM the pirate signal hijacks every propaganda screen. The memo. The photos. The gray candy formula: it was just old chewing gum. CandyCorp stock becomes a punchline by sunrise. The drones, unemployed, take up birdwatching.',
  },
};

export const INTRO_LINES = [
  'TBILISI. SORT OF. THE AIR IS 40% BASS.',
  'YOU: A KID WITH A SPRAY CAN AND A POUCH OF FICTIONAL CANDY.',
  'THE STREETS ARE HUNGRY. FEED THEM COLOR.',
];
