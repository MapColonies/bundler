import { join } from 'path';
import { BundlerOptions } from './interfaces';

export const TEMP_DIR = '/tmp/temp';
export const IMAGES_DIR = 'images';

export const DEFAULT_GITHUB_ORG = 'MapColonies';
export const DEFAULT_BRANCH = 'master';
export const DEFAULT_TAG = 'latest';
export const DEFAULT_CONTAINER_REGISTRY = 'acrarolibotnonprod.azurecr.io';

export const DOCKER_FILE = 'Dockerfile';
export const MIGRATIONS_DOCKER_FILE = 'migrations.Dockerfile';
export const HELM_DIR = 'helm';

export const TAR_FORMAT = 'tar';
export const TAR_GZIP_ARCHIVE_FORMAT = 'tar.gz';
export const ZIP_ARCHIVE_FORMAT = 'zip';

export const DEFAULT_OPTIONS: BundlerOptions = {
  workdir: join(TEMP_DIR, 'bundler'),
  outputPath: join(TEMP_DIR, 'bundler', `bundle.${TAR_GZIP_ARCHIVE_FORMAT}`),
  isDebugMode: false,
  cleanupMode: 'on-the-fly',
  verbose: false,
};
