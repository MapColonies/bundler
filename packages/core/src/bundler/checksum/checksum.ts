import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { DEFAULT_CHECKSUM_ALGORITHM } from '../constants';
import { BaseOutput } from '../interfaces';

interface Checksum {
  hash: string;
  algorithm: string;
}

const hashData = (data: Buffer, algorithm: string): string => {
  return createHash(algorithm).update(data).digest('hex');
};

export interface ChecksumOutput extends BaseOutput {
  checksum: Checksum;
}

export const createChecksum = async (path: string): Promise<Checksum> => {
  const buffer = await readFile(path);
  const hash = hashData(buffer, DEFAULT_CHECKSUM_ALGORITHM);

  return {
    algorithm: DEFAULT_CHECKSUM_ALGORITHM,
    hash,
  };
};
