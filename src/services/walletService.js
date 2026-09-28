import { COINS } from '../config';
import {
  addCoins,
  getCoins,
  getLastCheckIn,
  getPracticedStickerIds,
  savePracticedStickerIds,
  setLastCheckIn,
} from '../data/walletStore';
import { todayKey } from '../utils/date';

/**
 * Coins: earned by learning (see progressService), the daily gift, practice,
 * and cheering pals; spent in the Wardrobe (see petService).
 */

export { addCoins, getCoins };

/**
 * Daily check-in gift, claimable once per day from the Buddy screen.
 * Returns { claimed, earned, coins } - claimed=false when already taken today.
 */
export async function claimDailyGift() {
  const today = todayKey();
  if ((await getLastCheckIn()) === today) return { claimed: false, earned: 0 };
  await setLastCheckIn(today);
  const coins = await addCoins(COINS.checkInBonus);
  return { claimed: true, earned: COINS.checkInBonus, coins };
}

export async function isDailyGiftAvailable() {
  return (await getLastCheckIn()) !== todayKey();
}

/**
 * Award the pronunciation-practice bonus once per sticker.
 * Returns the coins earned (0 if this sticker was already practiced).
 */
export async function awardPracticeBonus(stickerId) {
  if (!stickerId) return 0;
  const practiced = await getPracticedStickerIds();
  if (practiced.includes(stickerId)) return 0;
  await savePracticedStickerIds([...practiced, stickerId]);
  await addCoins(COINS.practiceBonus);
  return COINS.practiceBonus;
}
