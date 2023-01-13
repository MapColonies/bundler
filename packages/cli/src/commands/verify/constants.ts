export const VERIFY_COMMAND_FACTORY = Symbol('VerifyCommandFactory');

export const command = 'verify';
export const describe = 'Verify the pre-requisites are set up correctly';

export const VERIFIED_MESSAGE = ' ready to bundle! 📦 ';
export const NOT_VERIFIED_MESSAGE = ' something is wrong 🥺 ';

export const PREFIX = (command: string): string => ` > executing ${command} command `;
