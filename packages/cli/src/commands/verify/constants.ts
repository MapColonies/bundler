export const VERIFY_COMMAND_FACTORY = Symbol('VerifyCommandFactory');

export const command = 'verify';
export const describe = 'Verify the pre-requisites are set up correctly';

export const VERIFIED_RESULT = 'ready to bundle! 📦';
export const NOT_VERIFIED_RESULT = 'something is wrong 🥺';

export const PREFIX = (command: string): string => ` > executing ${command} command `;
