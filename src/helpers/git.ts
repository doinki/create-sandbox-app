import { execSync } from 'node:child_process';

const isInGitRepository = (): boolean => {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const isInMercurialRepository = (): boolean => {
  try {
    execSync('hg --cwd . root', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const tryGitInit = (): boolean => {
  try {
    execSync('git --version', { stdio: 'ignore' });

    if (isInGitRepository() || isInMercurialRepository()) {
      return false;
    }

    execSync('git init', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

export default tryGitInit;
