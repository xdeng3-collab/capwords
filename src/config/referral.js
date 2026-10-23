// ==================== Invite a pal ====================
// Someone new signs up with your code: you both get Pro for a while. The
// server decides who earns what (supabase/migrations/*_referrals.sql); these
// numbers are only for the words on screen, so change them together with it.
export const REFERRAL = {
  rewardDays: 7, // Pro for each side of an invite
  maxBankedDays: 90, // invite Pro never runs more than this far ahead
  redeemWindowDays: 7, // a new account has this long to enter a pal's code
  endingSoonDays: 2, // warn this close to the end
};
