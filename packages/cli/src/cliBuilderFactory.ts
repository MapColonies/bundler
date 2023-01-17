import yargs, { Argv, CommandModule } from 'yargs';
import { FactoryFunction } from 'tsyringe';
import { BUNDLE_COMMAND_FACTORY } from './commands/bundle/constants';
import { LIST_COMMAND_FACTORY } from './commands/list/constants';
import { githubRegistrationMiddlewareFactory, loggerRegistrationMiddlewareFactory } from './wrappers/middleware';
import { VERIFY_COMMAND_FACTORY } from './commands/verify/constants';

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
    .option('verbose', { alias: 'v', describe: 'cli verbosity', nargs: 1, type: 'boolean', default: false })
    .option('token', { alias: 'tkn', describe: 'github access token', nargs: 1, type: 'string' })
    .help('h')
    .alias('h', 'help');

  args.middleware(loggerRegistrationMiddlewareFactory(dependencyContainer));
  args.middleware(githubRegistrationMiddlewareFactory(dependencyContainer));

  args.command(dependencyContainer.resolve<CommandModule>(BUNDLE_COMMAND_FACTORY));
  args.command(dependencyContainer.resolve<CommandModule>(LIST_COMMAND_FACTORY));
  args.command(dependencyContainer.resolve<CommandModule>(VERIFY_COMMAND_FACTORY));
  args.wrap(args.terminalWidth());

  return args;
};
