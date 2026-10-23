import AsyncStorage from '@react-native-async-storage/async-storage';
import { OUTFITS } from '../../config';
import { getPet } from '../petService';
import { applyEntitlements, buySouvenir } from '../purchaseService';
import {
  SOUVENIRS,
  grantSouvenirs,
  matchSouvenirsTo,
  outfitOnMap,
  placeAt,
  souvenirStatus,
} from '../souvenirService';

beforeEach(() => AsyncStorage.clear());

const kasa = SOUVENIRS.find((s) => s.id === 'kasa');

describe('souvenirs', () => {
  it('have ids of their own and a product each', () => {
    const ids = SOUVENIRS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(OUTFITS.some((o) => o.id === id)).toBe(false));
    SOUVENIRS.forEach((s) => expect(s.productId).toMatch(/^com\.capwordsxxx\.app\.souvenir\./));
  });

  it('are locked ahead, on loan while there, and for sale once passed', () => {
    expect(souvenirStatus(kasa, kasa.from - 1)).toBe('locked');
    expect(souvenirStatus(kasa, kasa.from)).toBe('here');
    expect(placeAt(kasa.from).key).toBe(kasa.place);
    expect(souvenirStatus(kasa, kasa.from + 100)).toBe('available');
    expect(souvenirStatus(kasa, kasa.from + 100, ['kasa'])).toBe('owned');
  });

  it('are worn on the map only while the buddy is there', () => {
    expect(outfitOnMap('crown', kasa.from)).toBe('kasa');
    expect(outfitOnMap('crown', kasa.from - 1)).not.toBe('kasa');
    expect(outfitOnMap('crown', 0)).toBe('crown');
  });
});

describe('buying a souvenir', () => {
  it('is refused for places not reached yet', async () => {
    expect(await buySouvenir('kasa', kasa.from - 1)).toEqual({ status: 'locked' });
    expect((await getPet()).ownedOutfits).not.toContain('kasa');
  });

  it('keeps it for good and wears it, also for a place already passed', async () => {
    expect(await buySouvenir('kasa', kasa.from + 30)).toEqual({ status: 'purchased' });
    const pet = await getPet();
    expect(pet.ownedOutfits).toContain('kasa');
    expect(pet.equippedOutfit).toBe('kasa');
    expect(await buySouvenir('kasa', kasa.from + 30)).toEqual({ status: 'owned' });
  });
});

describe('matching the App Store', () => {
  it('adds souvenirs bought elsewhere and takes back refunded ones', async () => {
    await grantSouvenirs(['kasa', 'beret'], { equip: true });
    await matchSouvenirsTo(['beret', 'lei']);
    const pet = await getPet();
    expect(pet.ownedOutfits).toEqual(['none', 'beret', 'lei']);
    // The refunded kasa was being worn: the buddy takes it off.
    expect(pet.equippedOutfit).toBe('none');
  });

  it('reads souvenirs out of the entitlements, leaving coin outfits alone', async () => {
    await AsyncStorage.setItem(
      'capwords_pet',
      JSON.stringify({ name: 'Bo', ownedOutfits: ['none', 'crown'], equippedOutfit: 'crown' })
    );
    await applyEntitlements([{ productId: kasa.productId, purchasedAt: 1 }]);
    const pet = await getPet();
    expect(pet.ownedOutfits).toEqual(['none', 'crown', 'kasa']);
    expect(pet.equippedOutfit).toBe('crown');
  });
});
