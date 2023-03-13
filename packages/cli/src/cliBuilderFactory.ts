import { EOL } from 'os';
import yargs, { Argv, CommandModule } from 'yargs';
import { FactoryFunction } from 'tsyringe';
import { ExitCodes } from '@map-colonies/bundler-common';
import { Logger } from 'pino';
import chalk from 'chalk';
import { BUNDLE_COMMAND_FACTORY } from './commands/bundle/constants';
import { LIST_COMMAND_FACTORY } from './commands/list/constants';
import { githubRegistrationMiddlewareFactory, verboseLoggerRegistrationMiddlewareFactory } from './wrappers/middleware';
import { VERIFY_COMMAND_FACTORY } from './commands/verify/constants';
import { SERVICES, TERMINAL_STREAM } from './common/constants';
import { IConfig } from './config/configStore';

export interface GlobalArguments {
  verbose: boolean;
  token?: string;
}

export const cliBuilderFactory: FactoryFunction<Argv> = (dependencyContainer) => {
  const args = yargs()
    .env()
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1, 'please provide a command')
    .recommendCommands()
    .option('verbose', { alias: 'v', describe: 'verbosity flag', type: 'boolean', default: false })
    .option('token', { alias: 't', describe: 'github access token', nargs: 1, type: 'string' })
    .group(['verbose', 'token', 'help', 'version'], 'Global Options:')
    .help('h')
    .alias('h', 'help')
    .fail((msg, err) => {
      args.showHelp('error');

      const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
      const configStore = dependencyContainer.resolve<IConfig>(SERVICES.CONFIG);
      const errorChalk = chalk.red.bold;

      if (msg) {
        TERMINAL_STREAM.write(errorChalk(`${EOL}${msg}${EOL}`));
      } else if (!logger.isLevelEnabled('debug')) {
        console.error(err);
      }

      logger.error({ err, msg: 'an error occurred while executing command', yargsMsg: msg, exitCode: ExitCodes.GENERAL_ERROR });

      TERMINAL_STREAM.write(errorChalk(`${EOL}the complete log of this run is located in: ${configStore.get<string>('logPath')}${EOL}${EOL}`));

      process.exitCode = ExitCodes.GENERAL_ERROR;

      throw err;
    });

  args.middleware(verboseLoggerRegistrationMiddlewareFactory(dependencyContainer));
  args.middleware(githubRegistrationMiddlewareFactory(dependencyContainer));

  args.command(dependencyContainer.resolve<CommandModule>(BUNDLE_COMMAND_FACTORY));
  args.command(dependencyContainer.resolve<CommandModule>(LIST_COMMAND_FACTORY));
  args.command(dependencyContainer.resolve<CommandModule>(VERIFY_COMMAND_FACTORY));
  args.wrap(args.terminalWidth());

  return args;
};
