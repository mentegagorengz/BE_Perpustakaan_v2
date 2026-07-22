import { ColumnNumericTransformer } from './numeric.transformer';

describe('ColumnNumericTransformer', () => {
  const transformer = new ColumnNumericTransformer();

  describe('from (DB -> app): PostgreSQL numeric dikembalikan sebagai string', () => {
    it('mengubah string numeric menjadi number', () => {
      expect(transformer.from('15000.00')).toBe(15000);
      expect(typeof transformer.from('15000.00')).toBe('number');
    });

    it('mengubah string desimal menjadi number dengan pecahan utuh', () => {
      expect(transformer.from('5000.50')).toBe(5000.5);
    });

    it('mengembalikan null apa adanya (kolom nullable)', () => {
      expect(transformer.from(null)).toBeNull();
    });

    it('meneruskan number yang sudah number', () => {
      expect(transformer.from(0)).toBe(0);
    });
  });

  describe('to (app -> DB)', () => {
    it('meneruskan number apa adanya untuk disimpan', () => {
      expect(transformer.to(15000)).toBe(15000);
    });

    it('meneruskan null apa adanya', () => {
      expect(transformer.to(null)).toBeNull();
    });
  });
});
