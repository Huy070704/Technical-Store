/**
 * Module augmentation to fix missing ValidateNested export
 * in class-validator type declarations.
 *
 * The compiled .d.ts files in class-validator may have a broken
 * re-export chain for ValidateNested. This declaration restores
 * the type so user code can import it from 'class-validator'.
 */
import { ValidationOptions } from 'class-validator';

declare module 'class-validator' {
  export function ValidateNested(
    validationOptions?: ValidationOptions,
  ): PropertyDecorator;
}
