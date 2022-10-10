import chalk from 'chalk';
import cpy from 'cpy';
import { readFileSync, writeFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PackageManager } from './helpers/getPkgManager';
import tryGitInit from './helpers/git';
import install from './helpers/install';
import isFolderEmpty from './helpers/isFolderEmpty';
import getOnline from './helpers/isOnline';
import isWriteable from './helpers/isWriteable';
import makeDir from './helpers/makeDir';

const __dirname = dirname(fileURLToPath(import.meta.url));

const createApp = async ({
  appPath,
  packageManager,
  template = 'default',
}: {
  appPath: string;
  packageManager: PackageManager;
  template: string;
}): Promise<void> => {
  const root = resolve(appPath);

  if (!isWriteable(dirname(root))) {
    console.error(
      `The application path is not writable, please check folder permissions and try again.
It is likely you do not have write permissions for this folder.`
    );
    process.exit(1);
  }

  const appName = basename(root);

  makeDir(root);
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  console.log(`Creating a new Next.js app in ${chalk.green(root)}.\n`);

  process.chdir(root);

  console.log(chalk.bold(`Using ${packageManager}.`));

  const templatePackageJson = JSON.parse(
    readFileSync(join(__dirname, 'templates', template, 'package.json'), 'utf8')
  );
  const packageJson = {
    name: appName,
    private: true,
    sideEffects: false,
    ...templatePackageJson,
  };

  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + EOL
  );

  const installFlags = { isOnline, packageManager };
  const { dependencies = {}, devDependencies = {} } = templatePackageJson as {
    dependencies?: object;
    devDependencies?: object;
  };

  console.log(
    Object.keys(dependencies).reduce(
      (prev, curr) => `${prev}- ${chalk.cyan(curr)}\n`,
      `\nInstalling dependencies:\n`
    )
  );

  await install(root, Object.keys(dependencies), installFlags);

  console.log(
    Object.keys(devDependencies).reduce(
      (prev, curr) => `${prev}- ${chalk.cyan(curr)}\n`,
      `\nInstalling devDependencies:\n`
    )
  );

  await install(root, Object.keys(devDependencies), {
    devDependencies: true,
    ...installFlags,
  });

  await cpy(join(__dirname, 'templates', template, '**'), root, {
    dot: true,
    filter: (file) => {
      return file.name !== 'package.json';
    },
    rename: (name) => {
      return name === 'gitignore' ? `.${name}` : name;
    },
  });

  if (tryGitInit()) {
    console.log('\nInitialized a git repository.');
  }

  const cdpath =
    join(originalDirectory, appName) === appPath ? appName : appPath;

  console.log(`\n${chalk.green('Success!')} Created ${appName} at ${appPath}
Inside that directory, you can run several commands:

  ${chalk.cyan(`${packageManager} ${useYarn ? '' : 'run '}dev`)}
    Starts the development server.

  ${chalk.cyan(`${packageManager} ${useYarn ? '' : 'run '}build`)}
    Builds the app for production.

  ${chalk.cyan(`${packageManager} start`)}
    Runs the built app in production mode.

We suggest that you begin by typing:

  ${chalk.cyan('cd')} ${cdpath}
  ${chalk.cyan(`${packageManager} ${useYarn ? '' : 'run '}dev`)}\n`);
};

export default createApp;
