export const BUNDLE_COMMAND_FACTORY = Symbol('BundleCommandFactory');

export const command = 'bundle';
export const describe = 'bundle github repositories and their artifacts into a single archive';

export const OWNER_TO_NAME_DELIMITER = '/';
export const NAME_TO_REF_DELIMITER = '@';
export const MAX_DELIMITER_OCCURRENCES = 1;

export const EXAMPLES: {
  command: string;
  description: string;
}[] = [
  {
    command: '$0 bundle -r ts-server-boilerplate -l -o ./output.tar.gz',
    description: '>>  bundle the given repository by building locally',
  },
  {
    command: '$0 bundle -R replica-server@v1.0.1 osm-sync-tracker@v3.2.0 -a -H -o ./output.tar.gz',
    description: '>>  bundle given repositories by pulling from registry and including given flags',
  },
  {
    command: '$0 bundle -i ./examples/input.json -o ./output.tar.gz',
    description: '>>  bundle according to the given possibly mixed criterias in the input file',
  },
];
