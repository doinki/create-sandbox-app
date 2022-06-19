import chalk from 'chalk';
import cpy from 'cpy';
import { writeFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PackageManager } from './helpers/getPkgManager';
import tryGitInit from './helpers/git';
import isFolderEmpty from './helpers/isFolderEmpty';
import getOnline from './helpers/isOnline';
import install from './helpers/install';
import isWriteable from './helpers/isWriteable';
import makeDir from './helpers/makeDir';

const __dirname = dirname(fileURLToPath(import.meta.url));

const createApp = async ({
  appPath,
  packageManager,
}: {
  appPath: string;
  packageManager: PackageManager;
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

  const packageJson = {
    name: appName,
    private: true,
    scripts: {
      analyze: 'ANALYZE=true yarn build',
      build: 'next build',
      dev: 'next dev',
      lint: 'next lint',
      start: 'next start',
      test: 'jest --coverage',
      'test:watch': 'jest --watch',
    },
    sideEffects: false,
    resolutions: {
      '@types/node': '^16.0.0',
      postcss: '^8.0.0',
    },
    dependencies: {},
    devDependencies: {},
  };

  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + EOL
  );

  const installFlags = { packageManager, isOnline };
  const dependencies = [
    'react',
    'react-dom',
    'next',
    '@next/bundle-analyzer',
    'next-seo',
    'clsx',
  ];
  const devDependencies = [
    '@jest/types',
    '@next/eslint-plugin-next',
    '@testing-library/dom',
    '@testing-library/jest-dom',
    '@testing-library/react',
    '@testing-library/user-event',
    '@types/jest',
    '@types/node@^16.0.0',
    '@types/react',
    '@types/react-dom',
    '@types/testing-library__jest-dom',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'eslint',
    'eslint-config-airbnb',
    'eslint-config-airbnb-typescript',
    'eslint-config-prettier',
    'eslint-import-resolver-typescript',
    'eslint-plugin-import',
    'eslint-plugin-jest',
    'eslint-plugin-jest-dom',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-prettier',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'eslint-plugin-simple-import-sort',
    'eslint-plugin-sort-destructure-keys',
    'eslint-plugin-sort-keys-fix',
    'eslint-plugin-tailwindcss',
    'eslint-plugin-testing-library',
    'eslint-plugin-trim',
    'eslint-plugin-typescript-sort-keys',
    'jest',
    'jest-environment-jsdom',
    'postcss',
    'postcss-flexbugs-fixes',
    'postcss-preset-env',
    'prettier',
    'tailwindcss',
    'typescript',
  ];

  console.log(
    dependencies.reduce(
      (prev, curr) => prev + `- ${chalk.cyan(curr)}\n`,
      `\nInstalling dependencies:\n`
    )
  );

  await install(root, dependencies, installFlags);

  console.log(
    devDependencies.reduce(
      (prev, curr) => prev + `- ${chalk.cyan(curr)}\n`,
      `\nInstalling devDependencies:\n`
    )
  );

  await install(root, devDependencies, {
    devDependencies: true,
    ...installFlags,
  });

  await cpy(join(__dirname, 'templates', 'default', '**'), root, {
    dot: true,
  });

  if (tryGitInit()) {
    console.log('\nInitialized a git repository.\n');
  }

  let cdpath = join(originalDirectory, appName) === appPath ? appName : appPath;

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
  ${chalk.cyan(`${packageManager} ${useYarn ? '' : 'run '}dev`)}
`);
};

export default createApp;
