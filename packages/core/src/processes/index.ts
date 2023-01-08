import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { PassThrough } from 'stream';
import * as readline from 'readline';
import { ILogger } from '../common/types';

interface ChildProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

const streamToString = async (stream: NodeJS.ReadableStream): Promise<string> => {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: ArrayBuffer) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};

const activeSpawns: { executable: string; childProcess: ChildProcessWithoutNullStreams }[] = [];

// TODO: pass logger function instead of logger
export const spawnChildProcess = (
  executable: string,
  command: string,
  commandArgs: string[] = [],
  envOptions?: NodeJS.ProcessEnv,
  verbose = false,
  logger?: ILogger
): ChildProcessWithoutNullStreams => {
  const childProcess = spawn(executable, [command, ...commandArgs], { env: { ...process.env, ...envOptions } });

  activeSpawns.push({ executable, childProcess });

  childProcess.stdin.setDefaultEncoding('utf-8');

  if (verbose) {
    const stdoutPipedForLogging = childProcess.stdout.pipe(new PassThrough());
    const stderrPipedForLogging = childProcess.stderr.pipe(new PassThrough());

    readline.createInterface(stdoutPipedForLogging).on('line', (line) => {
      if (line.length > 0 && logger) {
        logger.debug({ pid: childProcess.pid, executable, command, std: 'stdout', msg: line });
      }
    });

    readline.createInterface(stderrPipedForLogging).on('line', (line) => {
      if (line.length > 0 && logger) {
        logger.debug({ pid: childProcess.pid, executable, command, std: 'stderr', msg: line });
      }
    });
  }

  return childProcess;
};

export const promisifyChildProcess = async (childProcess: ChildProcessWithoutNullStreams): Promise<ChildProcessResult> => {
  const stdoutPipedForResult = childProcess.stdout.pipe(new PassThrough());
  const stderrPipedForResult = childProcess.stderr.pipe(new PassThrough());

  const promise = new Promise<ChildProcessResult>((resolve, reject) => {
    childProcess.once('exit', (code) => {
      activeSpawns.splice(
        activeSpawns.findIndex((spawn) => spawn.childProcess === childProcess),
        1
      );

      Promise.all([streamToString(stdoutPipedForResult), streamToString(stderrPipedForResult)])
        .then(([stdout, stderr]) => resolve({ exitCode: code, stdout, stderr }))
        .catch(reject);
    });

    childProcess.on('error', reject);
  });

  return promise;
};

// TODO: handle correctly
export const terminateSpawns = (executable?: string): void => {
  activeSpawns.forEach((spawn) => {
    if (spawn.executable !== executable || spawn.childProcess.killed) {
      return;
    }

    spawn.childProcess.stdin.end();
    spawn.childProcess.kill('SIGINT');
  });
};
