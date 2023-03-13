import { homedir } from 'os';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

const LOCAL_DIR = join(homedir(), '.bundler-cli');
const DEFAULT_WORKDIR = join(LOCAL_DIR, 'workdir');
const DEFAULT_CONFIG_PATH = join(LOCAL_DIR, 'config.json');

const HUMAN_READABLE_SPACING = 4;

interface BundlerCliConfig {
  workdir: string;
  githubAccessToken?: string;
}

const DEFAULT_LOCAL_CONFIG: BundlerCliConfig = {
  workdir: DEFAULT_WORKDIR,
};

export const LOGS_DIR = join(LOCAL_DIR, 'logs');

export const loadLocalConfig = async (configPath: string = DEFAULT_CONFIG_PATH): Promise<BundlerCliConfig> => {
  if (existsSync(configPath)) {
    return JSON.parse(await readFile(configPath, 'utf-8')) as BundlerCliConfig;
  }

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(DEFAULT_LOCAL_CONFIG, undefined, HUMAN_READABLE_SPACING), 'utf-8');

  return DEFAULT_LOCAL_CONFIG;
};
