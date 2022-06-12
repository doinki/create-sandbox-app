import { accessSync, constants } from 'node:fs';

const isWriteable = (directory: string): boolean => {
  try {
    accessSync(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

export default isWriteable;
