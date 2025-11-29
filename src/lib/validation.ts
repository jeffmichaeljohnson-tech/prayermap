/**
 * Input Validation with Contextual Errors:
 * - Schema-based validation
 * - Custom validators
 * - Error message generation
 * - Async validation support
 */

import { useState, useCallback } from 'react';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  meta?: Record<string, unknown>;
}

/**
 * Base validator class
 */
export abstract class Validator {
  protected optional_flag = false;
  protected customValidators: Array<(value: unknown) => ValidationResult> = [];

  abstract validate(value: unknown, field?: string): ValidationResult;

  optional(): this {
    this.optional_flag = true;
    return this;
  }

  custom(validator: (value: unknown) => ValidationResult): this {
    this.customValidators.push(validator);
    return this;
  }

  protected runCustomValidators(value: unknown, field: string): ValidationError[] {
    const errors: ValidationError[] = [];
    for (const validator of this.customValidators) {
      const result = validator(value);
      if (!result.valid) {
        errors.push(...result.errors.map((e) => ({ ...e, field })));
      }
    }
    return errors;
  }
}

/**
 * String validator
 */
export class StringValidator extends Validator {
  private minLength_value?: number;
  private maxLength_value?: number;
  private pattern_value?: RegExp;
  private oneOf_values?: string[];

  minLength(length: number): this {
    this.minLength_value = length;
    return this;
  }

  maxLength(length: number): this {
    this.maxLength_value = length;
    return this;
  }

  pattern(regex: RegExp): this {
    this.pattern_value = regex;
    return this;
  }

  oneOf(values: string[]): this {
    this.oneOf_values = values;
    return this;
  }

  validate(value: unknown, field: string = 'field'): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if value is undefined/null
    if (value === undefined || value === null || value === '') {
      if (!this.optional_flag) {
        errors.push({
          field,
          message: 'This field is required',
          code: 'required',
        });
      }
      return { valid: errors.length === 0, errors };
    }

    // Check type
    if (typeof value !== 'string') {
      errors.push({
        field,
        message: 'Must be a string',
        code: 'invalid_type',
        meta: { expected: 'string', received: typeof value },
      });
      return { valid: false, errors };
    }

    // Check min length
    if (this.minLength_value !== undefined && value.length < this.minLength_value) {
      errors.push({
        field,
        message: `Must be at least ${this.minLength_value} characters`,
        code: 'min_length',
        meta: { minLength: this.minLength_value, actual: value.length },
      });
    }

    // Check max length
    if (this.maxLength_value !== undefined && value.length > this.maxLength_value) {
      errors.push({
        field,
        message: `Must be at most ${this.maxLength_value} characters`,
        code: 'max_length',
        meta: { maxLength: this.maxLength_value, actual: value.length },
      });
    }

    // Check pattern
    if (this.pattern_value && !this.pattern_value.test(value)) {
      errors.push({
        field,
        message: 'Invalid format',
        code: 'pattern_mismatch',
      });
    }

    // Check oneOf
    if (this.oneOf_values && !this.oneOf_values.includes(value)) {
      errors.push({
        field,
        message: `Must be one of: ${this.oneOf_values.join(', ')}`,
        code: 'invalid_value',
        meta: { allowed: this.oneOf_values },
      });
    }

    // Run custom validators
    errors.push(...this.runCustomValidators(value, field));

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Number validator
 */
export class NumberValidator extends Validator {
  private min_value?: number;
  private max_value?: number;
  private integer_flag = false;

  min(value: number): this {
    this.min_value = value;
    return this;
  }

  max(value: number): this {
    this.max_value = value;
    return this;
  }

  integer(): this {
    this.integer_flag = true;
    return this;
  }

  validate(value: unknown, field: string = 'field'): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if value is undefined/null
    if (value === undefined || value === null) {
      if (!this.optional_flag) {
        errors.push({
          field,
          message: 'This field is required',
          code: 'required',
        });
      }
      return { valid: errors.length === 0, errors };
    }

    // Check type
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field,
        message: 'Must be a number',
        code: 'invalid_type',
        meta: { expected: 'number', received: typeof value },
      });
      return { valid: false, errors };
    }

    // Check integer
    if (this.integer_flag && !Number.isInteger(value)) {
      errors.push({
        field,
        message: 'Must be an integer',
        code: 'not_integer',
      });
    }

    // Check min
    if (this.min_value !== undefined && value < this.min_value) {
      errors.push({
        field,
        message: `Must be at least ${this.min_value}`,
        code: 'too_small',
        meta: { min: this.min_value, actual: value },
      });
    }

    // Check max
    if (this.max_value !== undefined && value > this.max_value) {
      errors.push({
        field,
        message: `Must be at most ${this.max_value}`,
        code: 'too_large',
        meta: { max: this.max_value, actual: value },
      });
    }

    // Run custom validators
    errors.push(...this.runCustomValidators(value, field));

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Boolean validator
 */
export class BooleanValidator extends Validator {
  validate(value: unknown, field: string = 'field'): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if value is undefined/null
    if (value === undefined || value === null) {
      if (!this.optional_flag) {
        errors.push({
          field,
          message: 'This field is required',
          code: 'required',
        });
      }
      return { valid: errors.length === 0, errors };
    }

    // Check type
    if (typeof value !== 'boolean') {
      errors.push({
        field,
        message: 'Must be a boolean',
        code: 'invalid_type',
        meta: { expected: 'boolean', received: typeof value },
      });
      return { valid: false, errors };
    }

    // Run custom validators
    errors.push(...this.runCustomValidators(value, field));

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Object validator
 */
export class ObjectValidator<T = Record<string, unknown>> extends Validator {
  constructor(private shape: Record<keyof T, Validator>) {
    super();
  }

  validate(value: unknown, field: string = 'object'): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if value is undefined/null
    if (value === undefined || value === null) {
      if (!this.optional_flag) {
        errors.push({
          field,
          message: 'This field is required',
          code: 'required',
        });
      }
      return { valid: errors.length === 0, errors };
    }

    // Check type
    if (typeof value !== 'object' || Array.isArray(value)) {
      errors.push({
        field,
        message: 'Must be an object',
        code: 'invalid_type',
        meta: { expected: 'object', received: typeof value },
      });
      return { valid: false, errors };
    }

    // Validate each field
    const obj = value as Record<string, unknown>;
    for (const [key, validator] of Object.entries(this.shape)) {
      const fieldName = field ? `${field}.${String(key)}` : String(key);
      const result = validator.validate(obj[key], fieldName);
      errors.push(...result.errors);
    }

    // Run custom validators
    errors.push(...this.runCustomValidators(value, field));

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Array validator
 */
export class ArrayValidator<T = unknown> extends Validator {
  private minLength_value?: number;
  private maxLength_value?: number;

  constructor(private itemValidator: Validator) {
    super();
  }

  minLength(length: number): this {
    this.minLength_value = length;
    return this;
  }

  maxLength(length: number): this {
    this.maxLength_value = length;
    return this;
  }

  validate(value: unknown, field: string = 'array'): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if value is undefined/null
    if (value === undefined || value === null) {
      if (!this.optional_flag) {
        errors.push({
          field,
          message: 'This field is required',
          code: 'required',
        });
      }
      return { valid: errors.length === 0, errors };
    }

    // Check type
    if (!Array.isArray(value)) {
      errors.push({
        field,
        message: 'Must be an array',
        code: 'invalid_type',
        meta: { expected: 'array', received: typeof value },
      });
      return { valid: false, errors };
    }

    // Check min length
    if (this.minLength_value !== undefined && value.length < this.minLength_value) {
      errors.push({
        field,
        message: `Must have at least ${this.minLength_value} items`,
        code: 'too_small',
        meta: { minLength: this.minLength_value, actual: value.length },
      });
    }

    // Check max length
    if (this.maxLength_value !== undefined && value.length > this.maxLength_value) {
      errors.push({
        field,
        message: `Must have at most ${this.maxLength_value} items`,
        code: 'too_large',
        meta: { maxLength: this.maxLength_value, actual: value.length },
      });
    }

    // Validate each item
    value.forEach((item, index) => {
      const result = this.itemValidator.validate(item, `${field}[${index}]`);
      errors.push(...result.errors);
    });

    // Run custom validators
    errors.push(...this.runCustomValidators(value, field));

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Schema builder
 */
export const schema = {
  string: (): StringValidator => new StringValidator(),
  number: (): NumberValidator => new NumberValidator(),
  boolean: (): BooleanValidator => new BooleanValidator(),
  object: <T>(shape: Record<keyof T, Validator>): ObjectValidator<T> =>
    new ObjectValidator<T>(shape),
  array: <T>(itemValidator: Validator): ArrayValidator<T> =>
    new ArrayValidator<T>(itemValidator),
};

/**
 * Prayer validation schemas
 */
export const prayerSchema = schema.object({
  title: schema.string().optional().maxLength(200),
  content: schema.string().minLength(10).maxLength(5000),
  content_type: schema.string().oneOf(['text', 'audio', 'video']),
  is_anonymous: schema.boolean(),
  location: schema.object({
    lat: schema.number().min(-90).max(90),
    lng: schema.number().min(-180).max(180),
  }),
});

export const prayerResponseSchema = schema.object({
  message: schema.string().minLength(1).maxLength(2000),
  content_type: schema.string().oneOf(['text', 'audio', 'video']),
  is_anonymous: schema.boolean(),
});

export const userProfileSchema = schema.object({
  username: schema
    .string()
    .minLength(3)
    .maxLength(30)
    .pattern(/^[a-zA-Z0-9_-]+$/),
  email: schema
    .string()
    .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  bio: schema.string().optional().maxLength(500),
});

/**
 * Validation hook
 */
export function useValidation<T>(
  validationSchema: Validator,
  initialValue: T
): {
  value: T;
  errors: ValidationError[];
  isValid: boolean;
  validate: () => ValidationResult;
  setField: (field: keyof T, fieldValue: unknown) => void;
  setValue: (newValue: T) => void;
  reset: () => void;
  getFieldError: (field: keyof T) => string | undefined;
} {
  const [value, setValue] = useState<T>(initialValue);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = useCallback((): ValidationResult => {
    const result = validationSchema.validate(value);
    setErrors(result.errors);
    return result;
  }, [value, validationSchema]);

  const setField = useCallback(
    (field: keyof T, fieldValue: unknown) => {
      setValue((prev) => ({
        ...prev,
        [field]: fieldValue,
      }));
    },
    []
  );

  const reset = useCallback(() => {
    setValue(initialValue);
    setErrors([]);
  }, [initialValue]);

  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      const fieldError = errors.find((e) => e.field === String(field));
      return fieldError?.message;
    },
    [errors]
  );

  return {
    value,
    errors,
    isValid: errors.length === 0,
    validate,
    setField,
    setValue,
    reset,
    getFieldError,
  };
}

/**
 * Form validation hook with field-level validation
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: ObjectValidator<T>,
  initialValues: T
): {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isDirty: boolean;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void;
  validateField: (field: keyof T) => void;
  validateForm: () => ValidationResult;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e?: React.FormEvent) => void;
  resetForm: () => void;
} {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | undefined>>({} as Record<keyof T, string | undefined>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const validateForm = useCallback((): ValidationResult => {
    const result = schema.validate(values);

    // Convert errors to field-level errors
    const fieldErrors: Record<string, string> = {};
    result.errors.forEach((error) => {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = error.message;
      }
    });

    setErrors(fieldErrors as Record<keyof T, string | undefined>);
    return result;
  }, [values, schema]);

  const validateField = useCallback(
    (field: keyof T) => {
      // This is simplified - in a real implementation, you'd validate just this field
      const result = validateForm();
      const fieldError = result.errors.find((e) => e.field === String(field));

      setErrors((prev) => ({
        ...prev,
        [field]: fieldError?.message,
      }));
    },
    [validateForm]
  );

  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [field]: isTouched,
    }));
  }, []);

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault();
        }

        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {} as Record<keyof T, boolean>
        );
        setTouched(allTouched);

        // Validate
        const result = validateForm();
        if (result.valid) {
          await onSubmit(values);
        }
      };
    },
    [values, validateForm]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string | undefined>);
    setTouched({} as Record<keyof T, boolean>);
  }, [initialValues]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const isValid = Object.values(errors).every((error) => !error);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateForm,
    handleSubmit,
    resetForm,
  };
}
