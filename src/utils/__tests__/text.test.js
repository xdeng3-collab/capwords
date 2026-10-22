import { formatPronunciation } from '../text';

describe('formatPronunciation', () => {
  it('wraps a bare pronunciation in one pair of slashes', () => {
    expect(formatPronunciation('flor')).toBe('/flor/');
  });

  it('does not double slashes the model already sent', () => {
    expect(formatPronunciation('/flor/')).toBe('/flor/');
    expect(formatPronunciation('//ˈa.ɣwa// ')).toBe('/ˈa.ɣwa/');
  });

  it('is empty when there is nothing to show', () => {
    expect(formatPronunciation('')).toBe('');
    expect(formatPronunciation(undefined)).toBe('');
    expect(formatPronunciation('//')).toBe('');
  });
});
