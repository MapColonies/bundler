import { join } from 'path';
import { readdir, writeFile } from 'fs/promises';

export async function* getFiles(dir: string, filter?: string[], ignore?: string[]): AsyncGenerator<string> {
  const dirents = await readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    if (ignore?.includes(dirent.name) === true) {
      continue;
    }

    const filePath = join(dir, dirent.name);

    // TODO: consider using fs.exists
    if (filter === undefined || filter.some((p) => dirent.name === p)) {
      yield filePath;
    }

    if (dirent.isDirectory()) {
      yield* getFiles(filePath, filter, ignore);
    }
  }
}

export const writeBuffer = async (data: ArrayBufferLike, path: string): Promise<void> => {
  const buffer = Buffer.from(data);
  await writeFile(path, buffer);
};
