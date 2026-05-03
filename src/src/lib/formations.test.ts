import { describe, expect, it } from 'vitest';
import { countByPosition, getFormation } from './formations';

describe('getFormation', () => {
  it('6v6: 1K 2V 1M 2A (totaal 6)', () => {
    const f = getFormation(6);
    expect(f).toHaveLength(6);
    expect(countByPosition(6)).toEqual({ K: 1, V: 2, M: 1, A: 2 });
  });

  it('7v7: 1K 2V 2M 2A (totaal 7)', () => {
    const f = getFormation(7);
    expect(f).toHaveLength(7);
    expect(countByPosition(7)).toEqual({ K: 1, V: 2, M: 2, A: 2 });
  });

  it('11v11: 1K 4V 3M 3A (totaal 11)', () => {
    const f = getFormation(11);
    expect(f).toHaveLength(11);
    expect(countByPosition(11)).toEqual({ K: 1, V: 4, M: 3, A: 3 });
  });

  it('formaties starten met K', () => {
    expect(getFormation(6)[0]).toBe('K');
    expect(getFormation(7)[0]).toBe('K');
    expect(getFormation(11)[0]).toBe('K');
  });
});
