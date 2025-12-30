// Utility types for the medication reminder application

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

// Date utilities
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimeRange {
  startTime: string; // HH:mm format
  endTime: string;
}

// ID types for type safety
export type UserId = string;
export type MedicationId = string;
export type ScheduleId = string;
export type AdherenceId = string;
export type CaregiverId = string;
export type NotificationId = string;

// Branded types for additional type safety
export type Brand<K, T> = K & { __brand: T };

export type Email = Brand<string, 'Email'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;
export type NDCCode = Brand<string, 'NDCCode'>;
export type RxCUI = Brand<string, 'RxCUI'>;

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Sort and filter options
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: SortOptions[];
  filters?: FilterOptions[];
}
