export const BUNDLE_COMMAND_FACTORY = Symbol('BundleCommandFactory');

export const command = 'bundle';
export const describe = 'bundle github repositories into a single archive';

export const OWNER_TO_NAME_DELIMITER = '/';
export const NAME_TO_REF_DELIMITER = '@';
export const MAX_DELIMITER_OCCURRENCES = 1;

export const BUNDLE_SUCCESS_MESSAGE = (path: string): string => ` bundle is ready at ${path} 🎉 `;

export const BUNDLE_FAILED_MESSAGE = ' bundle creation has failed 🥺 ';

export const PREFIX = (command: string): string => ` > executing ${command} command `;
