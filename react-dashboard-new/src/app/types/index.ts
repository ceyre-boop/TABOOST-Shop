export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

export interface Creator {
  id: string;
  name: string;
  handle: string;
  manager: string;
  badge: string;
  diamonds: number;
  rewards: number;
  hours: number;
  tier: Tier;
  tierGoal: number;
  tierLeft: number;
  last30Days: number;
  prevMonth: number;
  twoMonthsAgo: number;
  score: number;
  daysStreamed: number;
  dayPace: number;
  active: boolean;
  multiplyRate: number;
  hoursGoal: number;
  joinedMonth: string; // e.g. "2024-10"
}

export interface Manager {
  name: string;
  color: string;
  creators: Creator[];
}

export interface Alert {
  id: string;
  type: 'critical' | 'achievement' | 'new' | 'info' | 'reminder';
  title: string;
  message: string;
  time: string;
}
