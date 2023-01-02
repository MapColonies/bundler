export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LogFn = (obj: unknown, msg?: string, ...args: unknown[]) => void;

export interface ILogger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
}
