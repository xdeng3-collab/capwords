import { describeCheers } from '../friendService';

const from = (name) => ({ name });

describe('describeCheers', () => {
  it('names one pal by first name', () => {
    expect(describeCheers([from('Mia Chen')])).toBe('Mia cheered you on!');
  });

  it('names two pals, and counts the rest past that', () => {
    expect(describeCheers([from('Mia'), from('Leo')])).toBe('Mia and Leo cheered you on!');
    expect(describeCheers([from('Mia'), from('Leo'), from('Ana')])).toBe(
      'Mia and 2 others cheered you on!'
    );
  });

  it('counts a pal once however many days they cheered', () => {
    expect(describeCheers([from('Mia'), from('Mia')])).toBe('Mia cheered you on!');
  });

  it('is empty with no cheers', () => {
    expect(describeCheers([])).toBe('');
  });
});
