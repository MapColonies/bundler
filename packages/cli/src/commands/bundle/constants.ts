export const BUNDLE_COMMAND_FACTORY = Symbol('BundleCommandFactory');

export const command = 'bundle';
export const describe = 'bundle github repositories into a single archive';

export const OWNER_TO_NAME_DELIMITER = '/';
export const NAME_TO_REF_DELIMITER = '@';
export const MAX_DELIMITER_OCCURRENCES = 1;

export const EXAMPLES: {
  command: string;
  description: string;
}[] = [
  {
    command: '$0 bundle -o ./example.tar.gz -r ts-server-boilerplate -l -H',
    description: '>>  bundle the given repository by building locally and include: helm package',
  },
  {
    command: '$0 bundle -o ./example.tar.gz -R replica-server@v1.0.1 osm-sync-tracker@v3.2.0 -m -a -H',
    description: '>>  bundle the given repositories by pulling from registry and including: migrations, assets and helm packages',
  },
];
