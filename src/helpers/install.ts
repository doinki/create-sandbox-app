import chalk from 'chalk';
import spawn from 'cross-spawn';

import type { PackageManager } from './getPkgManager';

interface InstallOptions {
  devDependencies?: boolean;
  isOnline: boolean;
  packageManager: PackageManager;
}

const install = (
  root: string,
  dependencies: string[] | null,
  { devDependencies, isOnline, packageManager }: InstallOptions
): Promise<void> => {
  const npmFlags: string[] = [];
  const yarnFlags: string[] = [];

  return new Promise((resolve, reject) => {
    let args: string[];
    const useYarn = packageManager === 'yarn';

    if (dependencies?.length) {
      if (useYarn) {
        args = ['add'];
        if (!isOnline) args.push('--offline');
        args.push('--cwd', root);
        if (devDependencies) args.push('--dev');
      } else {
        args = ['install'];
        args.push(devDependencies ? '--save-dev' : '--save');
      }

      args.push(...dependencies);
    } else {
      args = ['install'];

      if (!isOnline) {
        console.log(chalk.yellow('You appear to be offline.'));
        if (useYarn) {
          console.log(chalk.yellow('Falling back to the local Yarn cache.'));
          args.push('--offline');
        } else {
          console.log();
        }
      }
    }

    if (useYarn) {
      args.push(...yarnFlags);
    } else {
      args.push(...npmFlags);
    }

    const child = spawn(packageManager, args, {
      env: {
        ...process.env,
        ADBLOCK: '1',
        DISABLE_OPENCOLLECTIVE: '1',
        NODE_ENV: 'development',
      },
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject({ command: `${packageManager} ${args.join()}` });
      } else {
        resolve();
      }
    });
  });
};

export default install;
