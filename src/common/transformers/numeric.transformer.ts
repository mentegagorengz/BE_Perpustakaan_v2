import { ValueTransformer } from 'typeorm';

/**
 * TypeORM menyimpan kolom `numeric`/`decimal` dan driver `pg` mengembalikannya
 * sebagai string (mis. "15000.00") untuk menjaga presisi. Transformer ini
 * mengonversi nilai tersebut kembali menjadi `number` saat entity dibaca,
 * sehingga field seperti `fine_amount` konsisten bertipe number di response
 * dan aman untuk perbandingan aritmetika.
 */
export class ColumnNumericTransformer implements ValueTransformer {
  /** app -> DB: simpan apa adanya (number/null). */
  to(value: number | null): number | null {
    return value;
  }

  /** DB -> app: ubah string numeric menjadi number, teruskan null. */
  from(value: string | number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    return parseFloat(value);
  }
}
