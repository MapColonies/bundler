import { TAR_GZIP_ARCHIVE_FORMAT } from '@map-colonies/bundler-common';

export const TEMP_DIR = 'tmp';
export const SOURCE_CODE_ARCHIVE = 'source-code';
export const HTTP_CLIENT_TIMEOUT = 10000;

export const DEFAULT_BRANCH = 'master';
export const DEFAULT_TAG = 'latest';

export const DOCKER_FILE = 'Dockerfile';
export const MIGRATIONS_DOCKER_FILE = 'migrations.Dockerfile';
export const HELM_DIR = 'helm';

export const TGZ_ARCHIVE_FORMAT = 'tgz';
export const ZIP_ARCHIVE_FORMAT = 'zip';

export const DEFAULT_BUNDLER_DIR = 'bundler';
export const DEFAULT_BUNDLER_OUTPUT = `bundle.${TAR_GZIP_ARCHIVE_FORMAT}`;
export const DEFAULT_CHECKSUM_ALGORITHM = 'sha256';
