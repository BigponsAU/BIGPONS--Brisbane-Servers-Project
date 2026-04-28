/**
 * Validation Middleware
 * Input validation using express-validator
 */

import { body, query, param, ValidationChain, validationResult, ValidationError } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { handleValidationError } from '../utils/error-handler';

/**
 * Middleware to check validation results
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err: ValidationError) => ({
      field: 'path' in err && typeof err.path === 'string' ? err.path : undefined,
      message: 'msg' in err && typeof err.msg === 'string' ? err.msg : 'Validation error'
    }));
    return handleValidationError(formattedErrors, res);
  }
  next();
};

/**
 * Validation for text analysis endpoint
 * POST /api/analyze
 */
export const validateAnalyze = [
  body('text')
    .isString()
    .withMessage('Text must be a string')
    .isLength({ min: 10, max: 50000 })
    .withMessage('Text must be between 10 and 50000 characters')
    .trim()
    .escape(),
  validate
];

/**
 * Validation for text generation endpoint
 * POST /api/generate
 * Note: Route uses 'topic' but validation checks both 'topic' and 'prompt' for compatibility
 */
export const validateGenerate = [
  body('topic')
    .isString()
    .withMessage('Topic must be a string')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Topic must be between 1 and 10000 characters')
    .trim()
    .escape(),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  validate
];

/**
 * Validation for document processing endpoint
 * POST /api/documents/process
 */
export const validateProcessDocument = [
  body('content')
    .isString()
    .withMessage('Content must be a string')
    .isLength({ min: 1, max: 1000000 })
    .withMessage('Content must be between 1 and 1000000 characters'),
  body('filename')
    .optional()
    .isString()
    .withMessage('Filename must be a string')
    .isLength({ max: 255 })
    .withMessage('Filename must be less than 255 characters'),
  body('fileType')
    .optional()
    .isString()
    .withMessage('File type must be a string'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags: unknown) => {
      if (Array.isArray(tags)) {
        return tags.every((tag: unknown) => typeof tag === 'string');
      }
      return true;
    })
    .withMessage('All tags must be strings'),
  body('autoStore')
    .optional()
    .isBoolean()
    .withMessage('AutoStore must be a boolean'),
  validate
];

/**
 * Validation for storage samples endpoint
 * POST /api/storage/samples
 */
export const validateAddSample = [
  body('text')
    .isString()
    .withMessage('Text must be a string')
    .isLength({ min: 1, max: 100000 })
    .withMessage('Text must be between 1 and 100000 characters')
    .trim(),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags: unknown) => {
      if (Array.isArray(tags)) {
        return tags.every((tag: unknown) => typeof tag === 'string');
      }
      return true;
    })
    .withMessage('All tags must be strings'),
  validate
];

/**
 * Validation for storage queries
 * GET /api/storage/*
 */
export const validateStorageQuery = [
  query('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  query('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  validate
];

/**
 * Validation for profile builder endpoint
 * POST /api/profile-builder/build
 */
export const validateProfileBuilder = [
  body('samples')
    .isArray()
    .withMessage('Samples must be an array')
    .isLength({ min: 1 })
    .withMessage('At least one sample is required')
    .custom((samples: unknown) => {
      if (Array.isArray(samples)) {
        return samples.every((sample: unknown) => 
          typeof sample === 'string' && sample.length > 0
        );
      }
      return false;
    })
    .withMessage('All samples must be non-empty strings'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  validate
];

/**
 * Validation for extrapolate endpoint
 * POST /api/extrapolate
 */
export const validateExtrapolate = [
  body('text')
    .isString()
    .withMessage('Text must be a string')
    .isLength({ min: 1, max: 50000 })
    .withMessage('Text must be between 1 and 50000 characters')
    .trim(),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object')
    .custom((options: unknown) => {
      if (options && typeof options === 'object') {
        const opts = options as Record<string, unknown>;
        if ('expansionLevel' in opts && opts.expansionLevel !== undefined) {
          const validLevels = ['minimal', 'moderate', 'extensive'];
          if (typeof opts.expansionLevel !== 'string' || !validLevels.includes(opts.expansionLevel)) {
            return false;
          }
        }
        if ('addExamples' in opts && opts.addExamples !== undefined && typeof opts.addExamples !== 'boolean') {
          return false;
        }
        if ('addDetails' in opts && opts.addDetails !== undefined && typeof opts.addDetails !== 'boolean') {
          return false;
        }
      }
      return true;
    })
    .withMessage('Options must match ExtrapolationOptions interface'),
  validate
];

/**
 * Validation for extract-patterns endpoint
 * POST /api/extract-patterns
 */
export const validateExtractPatterns = [
  body('text')
    .isString()
    .withMessage('Text must be a string')
    .isLength({ min: 1, max: 50000 })
    .withMessage('Text must be between 1 and 50000 characters')
    .trim(),
  validate
];

/**
 * Validation for shred endpoint
 * POST /api/shred
 */
export const validateShred = [
  body('text')
    .isString()
    .withMessage('Text must be a string')
    .isLength({ min: 1, max: 50000 })
    .withMessage('Text must be between 1 and 50000 characters')
    .trim(),
  validate
];

/**
 * Validation for compare-truths endpoint
 * POST /api/compare-truths
 */
export const validateCompareTruths = [
  body('text1')
    .isString()
    .withMessage('text1 must be a string')
    .isLength({ min: 1, max: 50000 })
    .withMessage('text1 must be between 1 and 50000 characters')
    .trim(),
  body('text2')
    .isString()
    .withMessage('text2 must be a string')
    .isLength({ min: 1, max: 50000 })
    .withMessage('text2 must be between 1 and 50000 characters')
    .trim(),
  validate
];

/**
 * Validation for match-voice endpoint
 * POST /api/match-voice
 */
export const validateMatchVoice = [
  body('text')
    .isString()
    .withMessage('Text must be a string')
    .isLength({ min: 1, max: 50000 })
    .withMessage('Text must be between 1 and 50000 characters')
    .trim(),
  validate
];

/**
 * Validation for extrapolate-project endpoint
 * POST /api/extrapolate-project
 */
export const validateExtrapolateProject = [
  body('projectPath')
    .isString()
    .withMessage('Project path must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Project path must be between 1 and 1000 characters')
    .trim(),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  validate
];

/**
 * Validation for storage principles POST endpoint
 * POST /api/storage/principles
 */
export const validateAddPrinciple = [
  body('principle')
    .isString()
    .withMessage('Principle must be a string')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Principle must be between 1 and 10000 characters')
    .custom((value: string) => {
      const text = String(value || '').trim();
      const words = text.split(/\s+/).filter(Boolean);
      const hasLongWord = words.some((word: string) => /[A-Za-z]{4,}/.test(word));
      const letters = (text.match(/[A-Za-z]/g) || []).length;
      const symbolCount = (text.match(/[^A-Za-z0-9\s.,;:!?'"()\-/%]/g) || []).length;
      const symbolRatio = symbolCount / Math.max(text.length, 1);
      const codeLikePattern = /\b(var|const|let|function|return|opacity|calc|rgba|background)\b|--|=>|\{|\}|\[|\]|::/i;
      if (letters < 3 || words.length < 2 || !hasLongWord || symbolRatio > 0.2 || /[{}[\]|=>]/.test(text) || codeLikePattern.test(text)) {
        throw new Error('Principle must include meaningful words, not only numbers/symbols');
      }
      return true;
    })
    .trim(),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 50000 })
    .withMessage('Description must be less than 50000 characters'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string')
    .isLength({ max: 255 })
    .withMessage('Category must be less than 255 characters'),
  body('examples')
    .optional()
    .isArray()
    .withMessage('Examples must be an array')
    .custom((examples: unknown) => {
      if (Array.isArray(examples)) {
        return examples.every((example: unknown) => typeof example === 'string');
      }
      return true;
    })
    .withMessage('All examples must be strings'),
  validate
];

/**
 * Validation for profiles endpoints
 * POST /api/profiles
 */
export const validateCreateProfile = [
  body('profile')
    .isObject()
    .withMessage('Profile must be an object'),
  body('metadata')
    .isObject()
    .withMessage('Metadata must be an object')
    .custom((metadata: unknown) => {
      if (metadata && typeof metadata === 'object') {
        const meta = metadata as Record<string, unknown>;
        if (!meta.name || typeof meta.name !== 'string') {
          return false;
        }
        if (!meta.version || typeof meta.version !== 'string') {
          return false;
        }
        if ('isDefault' in meta && typeof meta.isDefault !== 'boolean') {
          return false;
        }
      }
      return true;
    })
    .withMessage('Metadata must have name and version strings, and optional isDefault boolean'),
  validate
];

/**
 * Validation for run-tests endpoint
 * POST /api/run-tests
 */
export const validateRunTests = [
  body('suiteType')
    .optional()
    .isIn(['default', 'quick'])
    .withMessage('Suite type must be "default" or "quick"'),
  body('customSuite')
    .optional()
    .isObject()
    .withMessage('Custom suite must be an object'),
  validate
];

/**
 * Validation for storage cleanup endpoint
 * POST /api/storage/cleanup
 */
export const validateStorageCleanup = [
  body('dryRun')
    .optional()
    .isBoolean()
    .withMessage('dryRun must be a boolean'),
  body('deep')
    .optional()
    .isBoolean()
    .withMessage('deep must be a boolean'),
  body('aggressive')
    .optional()
    .isBoolean()
    .withMessage('aggressive must be a boolean'),
  validate
];

/**
 * Validation for test results endpoint
 * GET /api/test-results/:testId?
 */
export const validateTestResults = [
  param('testId')
    .optional()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('testId must be alphanumeric with underscores or hyphens'),
  validate
];

/**
 * Create custom validation chain
 * 
 * @param validations - Array of validation chains
 * @returns Combined validation middleware
 */
export function createValidation(...validations: ValidationChain[]): Array<ValidationChain | typeof validate> {
  return [...validations, validate];
}

