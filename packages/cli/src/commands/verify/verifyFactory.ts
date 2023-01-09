/* eslint-disable @typescript-eslint/no-magic-numbers */
import * as readline from 'readline';
import { FactoryFunction } from 'tsyringe';
import wcwidth from 'wcwidth';
import { Logger } from '@map-colonies/js-logger';
import { IGithubClient } from '@bundler/github';
import { CommandModule } from 'yargs';
import { dots as spinner } from 'cli-spinners';
import stripAnsi from 'strip-ansi';
import columnify, { GlobalOptions } from 'columnify';
import chalk from 'chalk';
import { dockerVerify, helmVerify } from '@bundler/core';
import { GlobalArguments } from '../../cliBuilderFactory';
import { ExitCodes, EXIT_CODE, SERVICES } from '../../common/constants';
import { command, describe, NOT_VERIFIED_RESULT, VERIFIED_RESULT } from './constants';

enum Status {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILURE = 'FAILURE',
}

const promiseResult = async <T>(promise: Promise<T>): Promise<[undefined, T] | [unknown, undefined]> => {
  try {
    const value = await promise;
    return [undefined, value];
  } catch (error) {
    return [error !== undefined ? error : new Error('internal promise rejected with undefined'), undefined];
  }
};

let i = 0;

interface VerifyEntity {
  name: string;
  verification: Promise<void>;
}

interface VerifyResult {
  name: string;
  status: Status;
  verified?: string;
  reason?: Error;
}

let lastContent = '';

const getLineCount = (text = lastContent): number => {
  const columns = process.stderr.columns || 80;

  let lineCount = 0;
  for (const line of stripAnsi(' '.repeat(10) + text).split('\n')) {
    lineCount += Math.max(1, Math.ceil(wcwidth(line) / columns));
  }

  return lineCount;
};

const indent = (content: string, amount = 0): string => {
  const indentation = ' '.repeat(Math.max(0, amount));
  return content
    .split('\n')
    .map((line) => `${indentation}${line}`)
    .join('\n');
};

const print = (content: string): void => {
  readline.cursorTo(process.stderr, 0);

  const linesToClear = getLineCount();

  for (let index = 0; index < linesToClear; index++) {
    if (index > 0) {
      readline.moveCursor(process.stderr, 0, -1);
    }

    readline.clearLine(process.stderr, 1);
  }

  readline.cursorTo(process.stderr, 0);

  lastContent = content;
  process.stderr.write(content);
};

const columnifyOptions: GlobalOptions = {
  align: 'left',
  columns: ['name', 'verified', 'reason'],
  config: { verified: { align: 'center' }, reason: { maxWidth: 80 } },
};

export const verifyCommandFactory: FactoryFunction<CommandModule<GlobalArguments, GlobalArguments>> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

  const handler = async (): Promise<void> => {
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    logger.debug({ msg: 'executing command', command });

    try {
      const entities: VerifyEntity[] = [
        {
          name: 'docker',
          verification: dockerVerify(),
        },
        {
          name: 'github',
          verification: githubClient.ping(),
        },
        {
          name: 'helm',
          verification: helmVerify(),
        },
      ];

      const results: VerifyResult[] = entities.map((entity) => ({
        name: entity.name,
        status: Status.PENDING,
      }));

      setInterval(() => {
        const { frames } = spinner;
        results.filter((entity) => entity.status === Status.PENDING).forEach((entity) => (entity.verified = frames[++i % frames.length]));
        print(`${indent('prefix\n', 0)}${indent(`${columnify(results, { ...columnifyOptions })}'\n`, 4)}`);
      }, spinner.interval * 2);

      await Promise.allSettled(
        entities.map(async (entity, index) => {
          await promiseResult(entity.verification).then(([error]) => {
            if (error === undefined) {
              results[index] = { ...results[index], status: Status.SUCCESS, verified: chalk.green('✔') };
            } else {
              results[index] = { ...results[index], status: Status.FAILURE, verified: chalk.red('✘'), reason: error as Error };
            }
          });
        })
      );

      const result = results.every((entity) => entity.status === Status.SUCCESS) ? VERIFIED_RESULT : NOT_VERIFIED_RESULT;
      print(`${indent('prefix\n', 0)}${indent(`${columnify(results, { ...columnifyOptions })}\n`, 4)}${indent(result, 4)}`);

      dependencyContainer.register(EXIT_CODE, { useValue: ExitCodes.SUCCESS });
    } catch (error) {
      dependencyContainer.register(EXIT_CODE, { useValue: ExitCodes.GENERAL_ERROR });
      logger.error({ err: error as Error, msg: 'an error occurred while executing command', command, exitCode: ExitCodes.GENERAL_ERROR });
    }
  };

  return {
    command,
    describe,
    handler,
  };
};
