import { ILogger } from '@map-colonies/bundler-common';
import { CheckError } from '../common/errors';

export type CoerceFunc<T1, T2> = (arg: T1 | undefined) => T2 | undefined;

export const coerce = <T1, T2>(coerce: CoerceFunc<T1, T2>, logger?: ILogger): CoerceFunc<T1, T2> => {
  const wrapper: CoerceFunc<T1, T2> = (arg) => {
    try {
      return coerce(arg);
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
