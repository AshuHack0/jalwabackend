/**
 * First deposit bonus offer tiers.
 * order: higher = lower tier (100 before 300 before 500, etc.)
 */
export const FIRST_DEPOSIT_BONUS_OFFERS = [
  {
    id: 1,
    rewardAmount: 18,
    rechargeAmount: 100,
    order: 10,
  },
  {
    id: 2,
    rewardAmount: 28,
    rechargeAmount: 300,
    order: 9,
  },
  {
    id: 3,
    rewardAmount: 108,
    rechargeAmount: 500,
    order: 8,
  },
  {
    id: 4,
    rewardAmount: 188,
    rechargeAmount: 1000,
    order: 7,
  },
  {
    id: 5,
    rewardAmount: 488,
    rechargeAmount: 5000,
    order: 6,
  },
];
