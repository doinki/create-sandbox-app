import chalk from 'chalk';
import checkForUpdate from 'update-check';

import getPkgManager from './getPkgManager';

const notifyUpdate = async (packageJson: object): Promise<void> => {
  try {
    const res = await checkForUpdate(packageJson).catch(() => null);

    if (res?.latest) {
      const pkgManager = getPkgManager();

      console.log(
        `${chalk.yellow.bold(
          'A new version of `create-sandbox-app` is available!'
        )}
You can update by running: ${chalk.cyan(
          pkgManager === 'yarn'
            ? 'yarn global add create-sandbox-app'
            : `${pkgManager} install --global create-sandbox-app`
        )}\n`
      );
    }

    process.exit();
  } catch {
    // ignore error;
  }
};

export default notifyUpdate;
