export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  BORROWED = 'BORROWED',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
}

export enum BookCondition {
  GOOD = 'GOOD',
  SLIGHTLY_DAMAGED = 'SLIGHTLY_DAMAGED',
  HEAVILY_DAMAGED = 'HEAVILY_DAMAGED',
}

export enum TransactionStatus {
  BORROWED = 'BORROWED',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}
