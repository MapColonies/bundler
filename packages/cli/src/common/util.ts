import { existsSync, PathLike } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

export const mkdirIfNotExists = async (path: PathLike): Promise<void> => {
  if (existsSync(path)) {
    return;
  }

  await mkdir(path, { recursive: true });
};

export const writeFileRecursive = async (...params: Parameters<typeof writeFile>): Promise<void> => {
  await mkdirIfNotExists(dirname(params[0] as string));
  await writeFile(params[0], params[1]);
};
