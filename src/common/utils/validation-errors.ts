import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { FieldError } from '../interfaces/api-response.interface';

/**
 * Ubah error class-validator menjadi detail per-field `{ field, message }`
 * sesuai API_STANDARDS.md §2.C. Dipakai sebagai `exceptionFactory`
 * ValidationPipe (main.ts dan test/setup-app.ts).
 */
export function buildValidationFieldErrors(
  errors: ValidationError[],
): FieldError[] {
  return errors.map((error) => ({
    field: error.property,
    message:
      Object.values(error.constraints ?? {})[0] ??
      `${error.property} tidak valid`,
  }));
}

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException(buildValidationFieldErrors(errors));
}
