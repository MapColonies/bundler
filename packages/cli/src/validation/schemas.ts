import { RepositoryBundleRequest } from '@map-colonies/bundler-common';
import { JSONSchemaType } from 'ajv';

export const BUNDLE_REQUEST_SCHEMA: JSONSchemaType<RepositoryBundleRequest[]> = {
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

export interface HasBundleRequest {
  input: RepositoryBundleRequest[];
}

export const HAS_BUNDLE_REQUEST_SCHEMA: JSONSchemaType<HasBundleRequest> = {
  type: 'object',
  additionalProperties: true,
  required: ['input'],
  properties: {
    input: BUNDLE_REQUEST_SCHEMA,
  },
};
