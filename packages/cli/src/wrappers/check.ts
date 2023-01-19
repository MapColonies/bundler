import { Arguments } from 'yargs';
import { ILogger } from '@bundler/core/src/common/types';
import { DependencyContainer } from 'tsyringe';
import { CheckError } from '../common/errors';

export type CheckFunc<T> = (args: Arguments<T>) => Promise<true> | true;
export type CheckFuncFactory<T> = (container: DependencyContainer) => CheckFunc<T>;

export const checkWrapper = <T>(check: CheckFunc<T>, logger?: ILogger): CheckFunc<T> => {
  const wrapper: CheckFunc<T> = (args) => {
    try {
      return check(args);
    } catch (err) {
      if (err instanceof CheckError) {
        logger?.error({
          msg: err.message,
          argument: err.argument,
          received: err.received,
        });
      }
      throw err;
    }
  };
  return wrapper;
};
