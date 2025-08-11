export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
  errorMessage?: string;
}

export class ValidationService {
  /**
   * Validate username according to app rules
   */
  static validateUsername(username: string): ValidationResult {
    if (!username || username.trim().length === 0) {
      return { isValid: false, error: 'Username is required' };
    }

    const trimmed = username.trim();

    if (trimmed.length < 2) {
      return { isValid: false, error: 'Username must be at least 2 characters long' };
    }

    if (trimmed.length > 30) {
      return { isValid: false, error: 'Username must be less than 30 characters' };
    }

    // Allow letters, numbers, underscores, hyphens
    const usernamePattern = /^[a-zA-Z0-9_-]+$/;
    if (!usernamePattern.test(trimmed)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }

    // Must start with letter or number
    const startsWithLetterOrNumber = /^[a-zA-Z0-9]/;
    if (!startsWithLetterOrNumber.test(trimmed)) {
      return { isValid: false, error: 'Username must start with a letter or number' };
    }

    return { isValid: true };
  }

  /**
   * Validate message text
   */
  static validateMessage(message: string): ValidationResult {
    if (!message || message.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    const trimmed = message.trim();

    if (trimmed.length > 1000) {
      return { isValid: false, error: 'Message must be less than 1000 characters' };
    }

    return { isValid: true };
  }

  /**
   * Validate display name
   */
  static validateDisplayName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Name is required' };
    }

    const trimmed = name.trim();

    if (trimmed.length < 1) {
      return { isValid: false, error: 'Name must be at least 1 character long' };
    }

    if (trimmed.length > 50) {
      return { isValid: false, error: 'Name must be less than 50 characters' };
    }

    return { isValid: true };
  }

  /**
   * Validate phone number
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    if (!phone || phone.trim().length === 0) {
      return { isValid: false, error: 'Phone number is required' };
    }

    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits

    if (cleaned.length < 10) {
      return { isValid: false, error: 'Phone number must be at least 10 digits' };
    }

    if (cleaned.length > 15) {
      return { isValid: false, error: 'Phone number must be less than 15 digits' };
    }

    return { isValid: true };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    if (!email || email.trim().length === 0) {
      return { isValid: false, error: 'Email is required' };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true };
  }

  /**
   * Generic validation with custom rules
   */
  static validate(value: string, rules: ValidationRule): ValidationResult {
    const trimmed = value.trim();

    // Required check
    if (rules.required && (!value || trimmed.length === 0)) {
      return { 
        isValid: false, 
        error: rules.errorMessage || 'This field is required' 
      };
    }

    // Skip other checks if empty and not required
    if (!value && !rules.required) {
      return { isValid: true };
    }

    // Min length check
    if (rules.minLength && trimmed.length < rules.minLength) {
      return { 
        isValid: false, 
        error: rules.errorMessage || `Must be at least ${rules.minLength} characters long` 
      };
    }

    // Max length check
    if (rules.maxLength && trimmed.length > rules.maxLength) {
      return { 
        isValid: false, 
        error: rules.errorMessage || `Must be less than ${rules.maxLength} characters` 
      };
    }

    // Pattern check
    if (rules.pattern && !rules.pattern.test(trimmed)) {
      return { 
        isValid: false, 
        error: rules.errorMessage || 'Invalid format' 
      };
    }

    // Custom validator
    if (rules.customValidator && !rules.customValidator(trimmed)) {
      return { 
        isValid: false, 
        error: rules.errorMessage || 'Invalid value' 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate multiple fields at once
   */
  static validateFields(fields: { [key: string]: { value: string; rules: ValidationRule } }): {
    isValid: boolean;
    errors: { [key: string]: string };
  } {
    const errors: { [key: string]: string } = {};
    
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const result = this.validate(field.value, field.rules);
      
      if (!result.isValid && result.error) {
        errors[fieldName] = result.error;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Clean username for URL/ID usage
   */
  static cleanUsername(username: string): string {
    return username
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');
  }
}

// Validation rules presets
export const ValidationRules = {
  USERNAME: {
    required: true,
    minLength: 2,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    errorMessage: 'Username can only contain letters, numbers, underscores, and hyphens',
  },
  
  MESSAGE: {
    required: true,
    minLength: 1,
    maxLength: 1000,
    errorMessage: 'Message must be between 1 and 1000 characters',
  },
  
  DISPLAY_NAME: {
    required: true,
    minLength: 1,
    maxLength: 50,
    errorMessage: 'Name must be between 1 and 50 characters',
  },
  
  PHONE: {
    required: true,
    minLength: 10,
    maxLength: 15,
    pattern: /^\+?[\d\s-()]+$/,
    errorMessage: 'Please enter a valid phone number',
  },
  
  EMAIL: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: 'Please enter a valid email address',
  },
} as const;
