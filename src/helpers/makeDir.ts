import { mkdirSync } from 'node:fs';

const makeDir = (root: string, options = { recursive: true }): void => {
  mkdirSync(root, options);
};

export default makeDir;
