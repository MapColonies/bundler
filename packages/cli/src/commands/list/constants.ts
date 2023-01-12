export const LIST_COMMAND_FACTORY = Symbol('ListCommandFactory');

export const command = 'list';
export const describe = 'list github repositories according to filters';

export const PREFIX = (command: string): string => ` > executing ${command} command `;
