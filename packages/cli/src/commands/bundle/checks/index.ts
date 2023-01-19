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
    throw new CheckError('exactly one of repository, repositories or input must be provided', ['repository', 'repositories', 'input'], undefined);
  }
  return true;
};
