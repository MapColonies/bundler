import { JSONSchemaType } from 'ajv';
import { InputFileBundleRequest } from '../commands/bundle/bundleFactory';

export const INPUT_BUNDLE_REQUEST_SCHEMA: JSONSchemaType<InputFileBundleRequest[]> = {
  type: 'array',
  minItems: 1,
  uniqueItemProperties: ['repository'],
  items: {
    type: 'object',
    required: ['repository'],
    additionalProperties: false,
    properties: {
      repository: {
        type: 'string',
        format: 'repository',
      },
      buildImageLocally: {
        type: 'boolean',
        nullable: true,
      },
      buildArgs: {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
        nullable: true,
        required: [],
      },
      includeMigrations: {
        type: 'boolean',
        nullable: true,
      },
      includeAssets: {
        type: 'boolean',
        nullable: true,
      },
      includeHelmPackage: {
        type: 'boolean',
        nullable: true,
      },
    },
  },
};
