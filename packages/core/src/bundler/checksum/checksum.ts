import { createHash, Hash } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { DEFAULT_CHECKSUM_ALGORITHM } from '../constants';
import { BaseOutput } from '../interfaces';

interface Checksum {
  hash: string;
  algorithm: string;
}

const hashStream = async (stream: ReadStream, hash: Hash): Promise<string> => {
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export interface ChecksumOutput extends BaseOutput {
  checksum: Checksum;
}

export const createChecksum = async (path: string, algorithm = DEFAULT_CHECKSUM_ALGORITHM): Promise<Checksum> => {
  const hash = createHash(algorithm);
  const stream = createReadStream(path);

  const hashResult = await hashStream(stream, hash);

  return {
    algorithm,
    hash: hashResult,
  };
};
