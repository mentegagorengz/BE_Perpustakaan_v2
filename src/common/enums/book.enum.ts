export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  BORROWED = 'BORROWED',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
}

export enum BookCondition {
  BAIK = 'BAIK',
  RUSAK_RINGAN = 'RUSAK_RINGAN',
  RUSAK_BERAT = 'RUSAK_BERAT',
}

export enum TransactionStatus {
  BORROWED = 'BORROWED',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}
