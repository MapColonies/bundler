import yargs from 'yargs';
import { Argv, CommandModule } from 'yargs';
import { FactoryFunction } from 'tsyringe';
import { BUNDLE_COMMAND_FACTORY } from './commands/bundle/constants';
import { LIST_COMMAND_FACTORY } from './commands/list/constants';

export interface GlobalArguments {
  verbose: boolean;
}

export const cliBuilderFactory: FactoryFunction<Argv> = (dependencyContainer) => {
  const args = yargs()
    .env()
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1, 'please provide a command')
    .option('verbose', { alias: 'v', describe: 'cli verbosity', nargs: 1, type: 'boolean', default: false })
    .help('h')
    .alias('h', 'help');

  args.command(dependencyContainer.resolve<CommandModule>(BUNDLE_COMMAND_FACTORY));
  args.command(dependencyContainer.resolve<CommandModule>(LIST_COMMAND_FACTORY));

  return args;
};
