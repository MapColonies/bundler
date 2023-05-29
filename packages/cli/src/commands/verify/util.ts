import { homedir } from 'os';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { decode } from 'jsonwebtoken';

const MILLISECONDS_IN_SECOND = 1000;

export const promiseResult = async <T>(promise: Promise<T>): Promise<[undefined, T] | [unknown, undefined]> => {
  try {
    const value = await promise;
    return [undefined, value];
  } catch (error) {
    return [error !== undefined ? error : new Error('internal promise rejected with undefined'), undefined];
  }
};

export const dockerRegistryVerification = async (registries: string[]): Promise<void> => {
  const validatedRegistries = registries.map((registry) => ({ registry, isValid: false }));

  const dockerConfigBuffer = await readFile(join(homedir(), '.docker', 'config.json'));

  const dockerConfigJson = JSON.parse(dockerConfigBuffer.toString()) as { auths: { [key: string]: { auth: string; identitytoken?: string } } };

  Object.keys(dockerConfigJson.auths).forEach((registry) => {
    if (!registries.includes(registry)) {
      return;
    }

    const auth = dockerConfigJson.auths[registry];

    if (auth.identitytoken === undefined) {
      throw new Error(`Docker registry ${registry} is not logged in.`);
    }

    const decoded = decode(auth.identitytoken);

    if (decoded === null || typeof decoded === 'string') {
      throw new Error(`Docker registry ${registry} token is invalid.`);
    }

    const nowInSeconds = Math.floor(Date.now() / MILLISECONDS_IN_SECOND);
    if (decoded.exp !== undefined && nowInSeconds >= decoded.exp) {
      throw new Error(`Docker registry ${registry} token has expired.`);
    }

    const index = validatedRegistries.findIndex((validatedRegistry) => validatedRegistry.registry === registry);
    validatedRegistries[index].isValid = true;
  });

  const invalid = validatedRegistries.filter((registry) => !registry.isValid);

  if (invalid.length > 0) {
    throw new Error(`Docker registries ${invalid.map((registry) => registry.registry).join(', ')} are not logged in.`);
  }
};
