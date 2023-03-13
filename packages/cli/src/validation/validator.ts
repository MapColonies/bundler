import Ajv from 'ajv';
import { JSONSchemaType } from 'ajv';
import * as ajvKeywords from 'ajv-keywords';
import addFormats from 'ajv-formats';
import betterAjvErrors from 'better-ajv-errors';
import { formats } from './formats';

const GENERAL_VALIDATION_ERROR = 'invalid content';

interface ValidationResponse<T> {
  isValid: boolean;
  errors?: string;
  content?: T;
}

let ajv: Ajv | undefined;

const ajvInit = (): Ajv => {
  const ajv = new Ajv({ $data: true, coerceTypes: true });

  ajvKeywords.default(ajv);
  addFormats(ajv);
  Object.entries(formats).forEach(([name, format]) => ajv.addFormat(name, format));

  return ajv;
};

function validate<T>(content: unknown, schema: JSONSchemaType<T>): ValidationResponse<T> {
  if (ajv === undefined) {
    ajv = ajvInit();
  }

  const isValid = ajv.validate(schema, content);

  if (!isValid) {
    const errors = ajv.errors === undefined || ajv.errors === null ? GENERAL_VALIDATION_ERROR : betterAjvErrors(schema, content, ajv.errors);
    return { isValid, errors };
  }

  return { isValid, content };
}

export { ValidationResponse, validate };
