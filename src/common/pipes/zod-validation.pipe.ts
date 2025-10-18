import { ErrorHandler, FrameworkZodValidationPipe, ValidationError } from '@doctori/shared';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema, ZodTypeAny } from 'zod';

/**
 * NestJS error handler for Zod validation
 */
class NestJSErrorHandler implements ErrorHandler {
  handleValidationError(error: ValidationError): never {
    throw new BadRequestException({
      message: error.message,
      errors: error.errors,
    });
  }
}

/**
 * NestJS-specific Zod validation pipe
 * Uses the shared package validation logic with NestJS error handling
 */
@Injectable()
export class NestJSZodValidationPipe<T = unknown> implements PipeTransform {
  private frameworkPipe: FrameworkZodValidationPipe<T>;

  constructor(schema: ZodSchema<unknown, ZodTypeAny, unknown>) {
    this.frameworkPipe = new FrameworkZodValidationPipe(
      schema as unknown as ZodSchema<T>,
      new NestJSErrorHandler()
    );
  }

  transform(value: unknown): T {
    return this.frameworkPipe.transform(value);
  }
}

/**
 * Creates a NestJS-compatible Zod validation pipe for a specific schema
 */
export function createNestJSZodValidationPipe<T>(schema: unknown): NestJSZodValidationPipe<T> {
  return new NestJSZodValidationPipe(schema as ZodSchema<unknown, ZodTypeAny, unknown>);
}
