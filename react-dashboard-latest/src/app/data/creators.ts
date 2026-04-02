import type { Creator, Tier } from '../types';

const MANAGERS = [
  'CARRINGTON', 'MARCO', 'DESTINY', 'JASMINE', 'TYLER',
  'MADISON', 'DEREK', 'SOFIA', 'MARCUS', 'BRIANNA',
  'HUNTER', 'KAYLA', 'DAMIEN', 'JESSICA', 'RYAN',
  'ASHLEY', 'JORDAN', 'TAYLOR', 'MORGAN', 'CASEY', 'ALEX'
];

export const MANAGER_COLORS: Record<string, string> = {
  CARRINGTON: '#ff0044', MARCO: '#f97316', DESTINY: '#a855f7',
  JASMINE: '#06b6d4', TYLER: '#84cc16', MADISON: '#ec4899',
  DEREK: '#14b8a6', SOFIA: '#f59e0b', MARCUS: '#6366f1',
  BRIANNA: '#10b981', HUNTER: '#ef4444', KAYLA: '#8b5cf6',
  DAMIEN: '#3b82f6', JESSICA: '#d946ef', RYAN: '#22c55e',
  ASHLEY: '#fb923c', JORDAN: '#e879f9', TAYLOR: '#34d399',
  MORGAN: '#60a5fa', CASEY: '#fbbf24', ALEX: '#a78bfa',
};

const BADGES = ['Music', 'Gaming', 'Food', 'ASMR', 'Dance', 'Comedy', 'Beauty', 'Sports', 'Talk', 'Art'];

const JOINED_MONTHS = ['2024-09','2024-10','2024-11','2024-12','2025-01','2025-02','2025-03','2025-04','2025-05','2025-06'];

const TIER_GOALS: Record<Tier, number> = { 6: 50000, 5: 200000, 4: 500000, 3: 1000000, 2: 2000000, 1: 5000000 };

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const TOP50: Partial<Creator>[] = [
  { name: 'samanthasingsit', handle: '@samanthasingsit', manager: 'CARRINGTON', badge: 'Music', diamonds: 1064591, rewards: 5700000, hours: 39, tier: 1, last30Days: 1064591, prevMonth: 980000, twoMonthsAgo: 850000, score: 97, daysStreamed: 28 },
  { name: 'daisy_dew4', handle: '@daisy_dew4', manager: 'CARRINGTON', badge: 'Dance', diamonds: 428000, rewards: 2100000, hours: 35, tier: 2, last30Days: 428000, prevMonth: 360000, twoMonthsAgo: 290000, score: 91, daysStreamed: 25 },
  { name: 'vivianbeauty', handle: '@vivianbeauty', manager: 'MARCO', badge: 'Beauty', diamonds: 390000, rewards: 1950000, hours: 32, tier: 2, last30Days: 390000, prevMonth: 410000, twoMonthsAgo: 350000, score: 88, daysStreamed: 24 },
  { name: 'rocketmanRJ', handle: '@rocketmanrj', manager: 'DESTINY', badge: 'Gaming', diamonds: 345000, rewards: 1720000, hours: 38, tier: 2, last30Days: 345000, prevMonth: 290000, twoMonthsAgo: 310000, score: 85, daysStreamed: 26 },
  { name: 'melodyqueen', handle: '@melodyqueen', manager: 'CARRINGTON', badge: 'Music', diamonds: 298000, rewards: 1490000, hours: 28, tier: 2, last30Days: 298000, prevMonth: 310000, twoMonthsAgo: 280000, score: 82, daysStreamed: 22 },
  { name: 'chefmario99', handle: '@chefmario99', manager: 'JASMINE', badge: 'Food', diamonds: 267000, rewards: 1335000, hours: 25, tier: 3, last30Days: 267000, prevMonth: 230000, twoMonthsAgo: 200000, score: 79, daysStreamed: 20 },
  { name: 'singleonthemove', handle: '@singleonthemove', manager: 'MARCO', badge: 'Talk', diamonds: 251000, rewards: 1255000, hours: 30, tier: 3, last30Days: 251000, prevMonth: 240000, twoMonthsAgo: 220000, score: 83, daysStreamed: 23 },
  { name: 'lancektyree', handle: '@lancektyree', manager: 'CARRINGTON', badge: 'Gaming', diamonds: 234000, rewards: 1170000, hours: 33, tier: 3, last30Days: 234000, prevMonth: 210000, twoMonthsAgo: 190000, score: 77, daysStreamed: 21 },
  { name: 'asmrwithrose', handle: '@asmrwithrose', manager: 'TYLER', badge: 'ASMR', diamonds: 219000, rewards: 1095000, hours: 27, tier: 3, last30Days: 219000, prevMonth: 230000, twoMonthsAgo: 210000, score: 74, daysStreamed: 22 },
  { name: 'sportking_leo', handle: '@sportking_leo', manager: 'MADISON', badge: 'Sports', diamonds: 198000, rewards: 990000, hours: 22, tier: 3, last30Days: 198000, prevMonth: 175000, twoMonthsAgo: 160000, score: 71, daysStreamed: 19 },
  { name: 'comedyclub_jess', handle: '@comedyclub_jess', manager: 'DEREK', badge: 'Comedy', diamonds: 185000, rewards: 925000, hours: 20, tier: 3, last30Days: 185000, prevMonth: 195000, twoMonthsAgo: 180000, score: 69, daysStreamed: 18 },
  { name: 'artbybeth', handle: '@artbybeth', manager: 'SOFIA', badge: 'Art', diamonds: 172000, rewards: 860000, hours: 18, tier: 3, last30Days: 172000, prevMonth: 150000, twoMonthsAgo: 140000, score: 72, daysStreamed: 17 },
  { name: 'gamingwithkai', handle: '@gamingwithkai', manager: 'MARCOS', badge: 'Gaming', diamonds: 163000, rewards: 815000, hours: 29, tier: 4, last30Days: 163000, prevMonth: 155000, twoMonthsAgo: 148000, score: 68, daysStreamed: 20 },
  { name: 'beautybynicole', handle: '@beautybynicole', manager: 'BRIANNA', badge: 'Beauty', diamonds: 156000, rewards: 780000, hours: 17, tier: 4, last30Days: 156000, prevMonth: 162000, twoMonthsAgo: 155000, score: 66, daysStreamed: 16 },
  { name: 'dancefloor_dee', handle: '@dancefloor_dee', manager: 'HUNTER', badge: 'Dance', diamonds: 148000, rewards: 740000, hours: 24, tier: 4, last30Days: 148000, prevMonth: 130000, twoMonthsAgo: 120000, score: 70, daysStreamed: 19 },
  { name: 'musicmaestro_m', handle: '@musicmaestro_m', manager: 'KAYLA', badge: 'Music', diamonds: 141000, rewards: 705000, hours: 21, tier: 4, last30Days: 141000, prevMonth: 138000, twoMonthsAgo: 135000, score: 65, daysStreamed: 18 },
  { name: 'talkshow_tina', handle: '@talkshow_tina', manager: 'DAMIEN', badge: 'Talk', diamonds: 134000, rewards: 670000, hours: 19, tier: 4, last30Days: 134000, prevMonth: 142000, twoMonthsAgo: 130000, score: 62, daysStreamed: 17 },
  { name: 'foodie_frank', handle: '@foodie_frank', manager: 'JESSICA', badge: 'Food', diamonds: 128000, rewards: 640000, hours: 16, tier: 4, last30Days: 128000, prevMonth: 120000, twoMonthsAgo: 115000, score: 64, daysStreamed: 15 },
  { name: 'asmr_angel', handle: '@asmr_angel', manager: 'RYAN', badge: 'ASMR', diamonds: 121000, rewards: 605000, hours: 22, tier: 4, last30Days: 121000, prevMonth: 128000, twoMonthsAgo: 118000, score: 60, daysStreamed: 18 },
  { name: 'comedyking_carl', handle: '@comedyking_carl', manager: 'ASHLEY', badge: 'Comedy', diamonds: 115000, rewards: 575000, hours: 15, tier: 4, last30Days: 115000, prevMonth: 108000, twoMonthsAgo: 100000, score: 63, daysStreamed: 14 },
  { name: 'sporty_sarah', handle: '@sporty_sarah', manager: 'JORDAN', badge: 'Sports', diamonds: 108000, rewards: 540000, hours: 18, tier: 4, last30Days: 108000, prevMonth: 115000, twoMonthsAgo: 105000, score: 59, daysStreamed: 16 },
  { name: 'artmaster_ava', handle: '@artmaster_ava', manager: 'TAYLOR', badge: 'Art', diamonds: 102000, rewards: 510000, hours: 14, tier: 4, last30Days: 102000, prevMonth: 98000, twoMonthsAgo: 95000, score: 61, daysStreamed: 13 },
  { name: 'gamer_greg', handle: '@gamer_greg', manager: 'MORGAN', badge: 'Gaming', diamonds: 96000, rewards: 480000, hours: 26, tier: 5, last30Days: 96000, prevMonth: 88000, twoMonthsAgo: 82000, score: 57, daysStreamed: 20 },
  { name: 'beautyboss_bella', handle: '@beautyboss_bella', manager: 'CASEY', badge: 'Beauty', diamonds: 91000, rewards: 455000, hours: 12, tier: 5, last30Days: 91000, prevMonth: 95000, twoMonthsAgo: 88000, score: 55, daysStreamed: 12 },
  { name: 'dancequeen_diana', handle: '@dancequeen_diana', manager: 'ALEX', badge: 'Dance', diamonds: 86000, rewards: 430000, hours: 16, tier: 5, last30Days: 86000, prevMonth: 80000, twoMonthsAgo: 75000, score: 58, daysStreamed: 15 },
  { name: 'musiclover_matt', handle: '@musiclover_matt', manager: 'CARRINGTON', badge: 'Music', diamonds: 82000, rewards: 410000, hours: 13, tier: 5, last30Days: 82000, prevMonth: 88000, twoMonthsAgo: 80000, score: 53, daysStreamed: 13 },
  { name: 'talkmaster_tony', handle: '@talkmaster_tony', manager: 'MARCO', badge: 'Talk', diamonds: 77000, rewards: 385000, hours: 11, tier: 5, last30Days: 77000, prevMonth: 72000, twoMonthsAgo: 68000, score: 54, daysStreamed: 11 },
  { name: 'chefqueen_quinn', handle: '@chefqueen_quinn', manager: 'DESTINY', badge: 'Food', diamonds: 73000, rewards: 365000, hours: 10, tier: 5, last30Days: 73000, prevMonth: 78000, twoMonthsAgo: 70000, score: 51, daysStreamed: 10 },
  { name: 'asmr_ace', handle: '@asmr_ace', manager: 'JASMINE', badge: 'ASMR', diamonds: 68000, rewards: 340000, hours: 14, tier: 5, last30Days: 68000, prevMonth: 65000, twoMonthsAgo: 62000, score: 52, daysStreamed: 12 },
  { name: 'comedy_crew_cam', handle: '@comedy_crew_cam', manager: 'TYLER', badge: 'Comedy', diamonds: 64000, rewards: 320000, hours: 9, tier: 5, last30Days: 64000, prevMonth: 70000, twoMonthsAgo: 65000, score: 48, daysStreamed: 9 },
  { name: 'sport_star_stan', handle: '@sport_star_stan', manager: 'MADISON', badge: 'Sports', diamonds: 59000, rewards: 295000, hours: 12, tier: 5, last30Days: 59000, prevMonth: 55000, twoMonthsAgo: 52000, score: 50, daysStreamed: 11 },
  { name: 'artvibe_alex', handle: '@artvibe_alex', manager: 'DEREK', badge: 'Art', diamonds: 55000, rewards: 275000, hours: 8, tier: 5, last30Days: 55000, prevMonth: 60000, twoMonthsAgo: 55000, score: 46, daysStreamed: 8 },
  { name: 'gamer_gina', handle: '@gamer_gina', manager: 'SOFIA', badge: 'Gaming', diamonds: 51000, rewards: 255000, hours: 21, tier: 5, last30Days: 51000, prevMonth: 47000, twoMonthsAgo: 45000, score: 47, daysStreamed: 15 },
  { name: 'beauty_bloom', handle: '@beauty_bloom', manager: 'MARCUS', badge: 'Beauty', diamonds: 47000, rewards: 235000, hours: 7, tier: 5, last30Days: 47000, prevMonth: 52000, twoMonthsAgo: 48000, score: 43, daysStreamed: 7 },
  { name: 'dance_diva_dana', handle: '@dance_diva_dana', manager: 'BRIANNA', badge: 'Dance', diamonds: 43000, rewards: 215000, hours: 10, tier: 6, last30Days: 43000, prevMonth: 40000, twoMonthsAgo: 38000, score: 44, daysStreamed: 9 },
  { name: 'music_monk_mike', handle: '@music_monk_mike', manager: 'HUNTER', badge: 'Music', diamonds: 39000, rewards: 195000, hours: 6, tier: 6, last30Days: 39000, prevMonth: 45000, twoMonthsAgo: 42000, score: 39, daysStreamed: 6 },
  { name: 'talk_time_tara', handle: '@talk_time_tara', manager: 'KAYLA', badge: 'Talk', diamonds: 35000, rewards: 175000, hours: 8, tier: 6, last30Days: 35000, prevMonth: 33000, twoMonthsAgo: 31000, score: 41, daysStreamed: 7 },
  { name: 'food_fanatic_fay', handle: '@food_fanatic_fay', manager: 'DAMIEN', badge: 'Food', diamonds: 31000, rewards: 155000, hours: 5, tier: 6, last30Days: 31000, prevMonth: 36000, twoMonthsAgo: 33000, score: 37, daysStreamed: 5 },
  { name: 'asmr_aria', handle: '@asmr_aria', manager: 'JESSICA', badge: 'ASMR', diamonds: 27000, rewards: 135000, hours: 7, tier: 6, last30Days: 27000, prevMonth: 25000, twoMonthsAgo: 24000, score: 38, daysStreamed: 6 },
  { name: 'comedy_cub', handle: '@comedy_cub', manager: 'RYAN', badge: 'Comedy', diamonds: 23000, rewards: 115000, hours: 4, tier: 6, last30Days: 23000, prevMonth: 28000, twoMonthsAgo: 25000, score: 33, daysStreamed: 4 },
  { name: 'sport_soul_sam', handle: '@sport_soul_sam', manager: 'ASHLEY', badge: 'Sports', diamonds: 19000, rewards: 95000, hours: 6, tier: 6, last30Days: 19000, prevMonth: 18000, twoMonthsAgo: 17000, score: 35, daysStreamed: 5 },
  { name: 'art_angel_amy', handle: '@art_angel_amy', manager: 'JORDAN', badge: 'Art', diamonds: 15000, rewards: 75000, hours: 3, tier: 6, last30Days: 15000, prevMonth: 20000, twoMonthsAgo: 18000, score: 30, daysStreamed: 3 },
  { name: 'gamer_grit_gus', handle: '@gamer_grit_gus', manager: 'TAYLOR', badge: 'Gaming', diamonds: 12000, rewards: 60000, hours: 27, tier: 6, last30Days: 12000, prevMonth: 11000, twoMonthsAgo: 10000, score: 29, daysStreamed: 18 },
  { name: 'beauty_bud_ben', handle: '@beauty_bud_ben', manager: 'MORGAN', badge: 'Beauty', diamonds: 9000, rewards: 45000, hours: 2, tier: 6, last30Days: 9000, prevMonth: 14000, twoMonthsAgo: 12000, score: 25, daysStreamed: 2 },
  { name: 'dance_dawn_dot', handle: '@dance_dawn_dot', manager: 'CASEY', badge: 'Dance', diamonds: 6500, rewards: 32500, hours: 4, tier: 6, last30Days: 6500, prevMonth: 8000, twoMonthsAgo: 9000, score: 22, daysStreamed: 4 },
  { name: 'music_mood_mia', handle: '@music_mood_mia', manager: 'ALEX', badge: 'Music', diamonds: 4200, rewards: 21000, hours: 1, tier: 6, last30Days: 4200, prevMonth: 7000, twoMonthsAgo: 6000, score: 18, daysStreamed: 1 },
  { name: 'rookie_ray', handle: '@rookie_ray', manager: 'CARRINGTON', badge: 'Talk', diamonds: 2800, rewards: 14000, hours: 5, tier: 6, last30Days: 2800, prevMonth: 0, twoMonthsAgo: 0, score: 20, daysStreamed: 4 },
  { name: 'new_nikki', handle: '@new_nikki', manager: 'MARCO', badge: 'Gaming', diamonds: 1500, rewards: 7500, hours: 3, tier: 6, last30Days: 1500, prevMonth: 0, twoMonthsAgo: 0, score: 15, daysStreamed: 2 },
  { name: 'fresh_felix', handle: '@fresh_felix', manager: 'DESTINY', badge: 'Comedy', diamonds: 800, rewards: 4000, hours: 2, tier: 6, last30Days: 800, prevMonth: 0, twoMonthsAgo: 0, score: 12, daysStreamed: 2 },
  { name: 'beginner_beth', handle: '@beginner_beth', manager: 'JASMINE', badge: 'ASMR', diamonds: 350, rewards: 1750, hours: 1, tier: 6, last30Days: 350, prevMonth: 0, twoMonthsAgo: 0, score: 10, daysStreamed: 1 },
];

function generateCreators(): Creator[] {
  const rand = rng(42);
  const result: Creator[] = [];

  TOP50.forEach((c, i) => {
    const tier = (c.tier ?? 6) as Tier;
    const goal = TIER_GOALS[tier];
    const diamonds = c.diamonds ?? 0;
    const joinIdx = Math.floor(rand() * JOINED_MONTHS.length);
    result.push({
      id: `c${i + 1}`,
      name: c.name ?? `creator${i}`,
      handle: c.handle ?? `@creator${i}`,
      manager: c.manager ?? MANAGERS[i % MANAGERS.length],
      badge: c.badge ?? BADGES[i % BADGES.length],
      diamonds,
      rewards: c.rewards ?? Math.floor(diamonds * (2.5 + rand() * 5)),
      hours: c.hours ?? Math.floor(1 + rand() * 35),
      tier,
      tierGoal: goal,
      tierLeft: Math.max(0, goal - diamonds),
      last30Days: c.last30Days ?? diamonds,
      prevMonth: c.prevMonth ?? Math.floor(diamonds * (0.7 + rand() * 0.6)),
      twoMonthsAgo: c.twoMonthsAgo ?? Math.floor(diamonds * (0.5 + rand() * 0.6)),
      score: c.score ?? Math.floor(10 + rand() * 90),
      daysStreamed: c.daysStreamed ?? Math.floor(1 + rand() * 28),
      dayPace: c.dayPace ?? Math.floor(40 + rand() * 60),
      active: diamonds > 0,
      multiplyRate: 1 + Math.floor(rand() * 3),
      hoursGoal: Math.floor(20 + rand() * 20),
      joinedMonth: JOINED_MONTHS[joinIdx],
    });
  });

  // Generate remaining creators to reach 802 total
  for (let i = TOP50.length; i < 802; i++) {
    const tier = ([6,6,6,6,6,6,5,5,5,4,4,3,2,1][Math.floor(rand() * 14)] ?? 6) as Tier;
    const goal = TIER_GOALS[tier];
    const baseDiamonds = tier === 6 ? Math.floor(rand() * 50000) : 
      tier === 5 ? Math.floor(50000 + rand() * 150000) :
      tier === 4 ? Math.floor(100000 + rand() * 400000) :
      tier === 3 ? Math.floor(200000 + rand() * 800000) :
      tier === 2 ? Math.floor(500000 + rand() * 1500000) :
      Math.floor(1000000 + rand() * 4000000);
    const diamonds = Math.floor(rand() < 0.38 ? 0 : baseDiamonds);
    const mgr = MANAGERS[Math.floor(rand() * MANAGERS.length)];
    const badge = BADGES[Math.floor(rand() * BADGES.length)];
    const hours = diamonds > 0 ? Math.floor(1 + rand() * 38) : 0;
    const score = diamonds > 0 ? Math.floor(10 + rand() * 90) : 0;
    const joinIdx = Math.floor(rand() * JOINED_MONTHS.length);

    result.push({
      id: `c${i + 1}`,
      name: `creator_${i + 1}`,
      handle: `@creator_${i + 1}`,
      manager: mgr,
      badge,
      diamonds,
      rewards: Math.floor(diamonds * (2 + rand() * 5)),
      hours,
      tier,
      tierGoal: goal,
      tierLeft: Math.max(0, goal - diamonds),
      last30Days: diamonds,
      prevMonth: Math.floor(diamonds * (0.6 + rand() * 0.8)),
      twoMonthsAgo: Math.floor(diamonds * (0.4 + rand() * 0.7)),
      score,
      daysStreamed: hours > 0 ? Math.floor(1 + rand() * 25) : 0,
      dayPace: Math.floor(rand() * 100),
      active: diamonds > 0,
      multiplyRate: 1 + Math.floor(rand() * 3),
      hoursGoal: Math.floor(20 + rand() * 20),
      joinedMonth: JOINED_MONTHS[joinIdx],
    });
  }

  return result;
}

export const CREATORS: Creator[] = generateCreators();

export const ACTIVE_CREATORS = CREATORS.filter(c => c.diamonds > 0);

export const TOTAL_DIAMONDS = CREATORS.reduce((s, c) => s + c.diamonds, 0);
export const TOTAL_REWARDS = CREATORS.reduce((s, c) => s + c.rewards, 0);
export const TOTAL_HOURS = CREATORS.reduce((s, c) => s + c.hours, 0);
