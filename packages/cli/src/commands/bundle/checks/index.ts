import { existsSync } from 'fs';
import { CHECKSUM_FILE } from '@map-colonies/bundler-common';
import { CheckError } from '../../../common/errors';
import { CheckFunc } from '../../../wrappers/check';
import { BundleArguments } from '../bundleFactory';

interface BundleArgumentsWhileBuild extends Omit<BundleArguments, 'repository' | 'repositories' | 'input'> {
  input?: string;
  repository?: string;
  repositories?: string[];
}

export const repoProvidedCheck: CheckFunc<BundleArgumentsWhileBuild> = (args) => {
  if (args.repository === undefined && args.repositories === undefined && args.input === undefined) {
    throw new CheckError(
      'exactly one of the following must be provided: repository \\ repositories \\ input',
      ['repository', 'repositories', 'input'],
      undefined
    );
  }
  return true;
};

export const outputValidityCheck: CheckFunc<BundleArgumentsWhileBuild> = (args) => {
  if (!args.override && (existsSync(args.outputPath) || existsSync(`${`${args.outputPath}-${CHECKSUM_FILE}`}`))) {
    throw new CheckError(
      `output file ${args.outputPath} or ${args.outputPath}-${CHECKSUM_FILE} already exists, choose another path or override using the --override option`,
      ['outputPath'],
      args.outputPath
    );
  }
  return true;
};
