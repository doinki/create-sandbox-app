#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import spawn from 'cross-spawn';
import { execSync } from 'node:child_process';
import { lookup } from 'node:dns';
import {
  accessSync,
  constants,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { EOL } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { URL } from 'node:url';
import prompts from 'prompts';
import checkForUpdate from 'update-check';
import validate from 'validate-npm-package-name';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const program = new Command(packageJson.name);
let projectName: string | undefined;

//#region helpers
const getProxy = () => {
  if (process.env.https_proxy) {
    return process.env.https_proxy;
  }

  try {
    const httpsProxy = execSync('npm config get https-proxy').toString().trim();
    return httpsProxy !== 'null' ? httpsProxy : undefined;
  } catch {
    return;
  }
};

const getIsOnline = (): Promise<boolean> => {
  return new Promise((resolve) => {
    lookup('registry.yarnpkg.com', (err) => {
      if (!err) {
        return resolve(true);
      }

      const proxy = getProxy();

      if (!proxy) {
        return resolve(false);
      }

      try {
        const { hostname } = new URL(proxy);

        lookup(hostname, (err) => {
          resolve(err === null);
        });
      } catch {
        return resolve(false);
      }
    });
  });
};

const install = (
  root: string,
  dependencies: string[],
  {
    devDependencies,
    isOnline,
    useYarn,
  }: { useYarn: boolean; isOnline: boolean; devDependencies?: boolean }
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let args: string[];
    let command = useYarn ? 'yarnpkg' : 'npm';

    if (useYarn) {
      args = ['add'];
      if (!isOnline) {
        args.push('--offline');
      }
      args.push('--cwd', root);
    } else {
      args = ['install'];
    }
    if (devDependencies) {
      args.push('-D');
    }
    args.push(...dependencies);

    const child = spawn(command, args, {
      env: { ...process.env, ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject({ command: `${command} ${args.join(' ')}` });
        return;
      }

      resolve();
    });
  });
};

const isSafeToCreate = (root: string, name: string) => {
  const validFiles = [
    '.DS_STORE',
    '.git',
    '.gitattributes',
    '.gitignore',
    '.gitlab-ci.yml',
    '.hg',
    '.hgcheck',
    '.hgignore',
    '.idea',
    '.npmignore',
    '.travis.yml',
    'docs',
    'LICENSE',
    'README.md',
    'mkdocs.yml',
    'Thumbs.db',
    'npm-debug.log',
    'yarn-error.log',
    'yarn-debug.log',
  ];

  const conflicts = readdirSync(root)
    .filter((file) => !validFiles.includes(file))
    .filter((file) => !/\.iml$/.test(file));

  if (conflicts.length > 0) {
    let message = `\nThe directory ${chalk.green(
      name
    )} contains files that could conflict:\n\n`;

    for (const file of conflicts) {
      try {
        const stats = lstatSync(join(root, file));
        if (stats.isDirectory()) {
          message += `  ${chalk.blue(`${file}/`)}\n`;
        } else {
          message += `  ${file}\n`;
        }
      } catch {
        message += `  ${file}\n`;
      }
    }

    message +=
      '\nEither try using a new directory name, or remove the files listed above.\n';

    console.error(message);
    return false;
  }

  return true;
};

const isUsingYarn = () => {
  return (process.env.npm_config_user_agent || '').startsWith('yarn');
};

const isWriteable = (path: string) => {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const notifyUpdate = async () => {
  const res = await checkForUpdate(packageJson).catch(() => null);

  if (res?.latest) {
    const isYarn = isUsingYarn();

    console.warn(`
${chalk.yellow.bold('A new version of `create-sandbox-app` is available!')}
You can update by running: ${chalk.cyan(
      isYarn
        ? 'yarn global add create-sandbox-app'
        : 'npm i -g create-sandbox-app'
    )}
`);
  }

  process.exit();
};

const validateProjectName = (
  name: string
): { problems?: string[]; valid: boolean } => {
  const { errors, validForNewPackages, warnings } = validate(name);

  if (validForNewPackages) {
    return { valid: true };
  }

  let problems: string[] = [];

  if (errors) {
    problems = problems.concat(errors);
  }
  if (warnings) {
    problems = problems.concat(warnings);
  }

  return {
    problems,
    valid: false,
  };
};
//#endregion

const createApp = async ({
  appPath,
  useNpm,
}: {
  appPath: string;
  useNpm: boolean;
}) => {
  const root = resolve(appPath);

  if (!isWriteable(dirname(root))) {
    console.error(
      `
The application path is not writable, please check folder permissions and try again.
It is likely you do not have write permissions for this folder.
`
    );
    process.exit(1);
  }

  const appName = basename(root);

  mkdirSync(root, { recursive: true });

  if (!isSafeToCreate(root, appName)) {
    process.exit(1);
  }

  const useYarn = useNpm ? false : isUsingYarn();
  const isOnline = !useYarn || (await getIsOnline());
  const originalDirectory = process.cwd();
  const displayedCommand = useYarn ? 'yarn' : 'npm';
  process.chdir(root);
  console.log(`Creating a new Next.js app in ${chalk.green(root)}.

${chalk.bold(`Using ${displayedCommand}.`)}`);

  const packageJson = {
    dependencies: {},
    devDependencies: {},
    name: appName,
    private: true,
    scripts: {
      build: 'next build',
      dev: 'next dev',
      lint: 'next lint',
      start: 'next start',
    },
  };

  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + EOL
  );

  const installFlags = { useYarn, isOnline };
  const dependencies = ['react', 'react-dom', 'next'];
  const devDependencies = [
    '@types/node',
    '@types/react',
    'eslint',
    'eslint-config-next',
    'typescript',
  ];

  let message = `
Installing dependencies:
`;

  for (const dependency of dependencies) {
    message += `- ${chalk.cyan(dependency)}\n`;
  }

  console.log(message);

  await install(root, dependencies, installFlags);

  message = `
Installing devDependencies:
`;

  for (const devDependency of devDependencies) {
    message += `- ${chalk.cyan(devDependency)}\n`;
  }

  console.log(message);

  const devInstallFlags = { devDependencies: true, ...installFlags };
  await install(root, devDependencies, devInstallFlags);

  let cdpath: string;
  if (join(originalDirectory, appName) === appPath) {
    cdpath = appName;
  } else {
    cdpath = appPath;
  }

  console.log(`
${chalk.green('Success!')} Created ${appName} at ${appPath}
Inside that directory, you can run several commands:

  ${chalk.cyan(`${displayedCommand} ${useYarn ? '' : 'run '}dev`)}
    Starts the development server.

  ${chalk.cyan(`${displayedCommand} ${useYarn ? '' : 'run '}build`)}
    Builds the app for production.

  ${chalk.cyan(`${displayedCommand} start`)}
    Runs the built app in production mode.

We suggest that you begin by typing:

  ${chalk.cyan('cd')} ${cdpath}
  ${chalk.cyan(`${displayedCommand} ${useYarn ? '' : 'run '}dev`)}
`);
};

program
  .argument('[project-directory]')
  .action((name) => {
    projectName = name;
  })
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .option('--use-npm', 'Explicitly tell the CLI to bootstrap the app using npm')
  .version(packageJson.version)
  .allowUnknownOption()
  .parse(process.argv);

(async () => {
  if (typeof projectName === 'string') {
    projectName = projectName.trim();
  }

  if (!projectName) {
    const res = await prompts({
      initial: 'my-app',
      name: 'path',
      message: 'What is your project named?',
      type: 'text',
      validate: (name) => {
        const { problems, valid } = validateProjectName(
          basename(resolve(name))
        );

        if (valid) {
          return true;
        }

        return `Invalid project name: ${problems}`;
      },
    });

    projectName = res.path;
  }

  if (!projectName) {
    console.log(
      `
Please specify the project directory:
  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}

For example:
  ${chalk.cyan(program.name())} ${chalk.green('my-app')}

Run ${chalk.cyan(`${program.name()} --help`)} to see all options.
`
    );
    process.exit(1);
  }

  const resolvedPath = resolve(projectName);
  const appName = basename(resolvedPath);

  const { problems, valid } = validateProjectName(appName);

  if (!valid) {
    let message = `
Could not create a project called ${chalk.red(
      `"${appName}"`
    )} because of npm naming restrictions:
`;

    problems!.forEach((p) => {
      message += `  ${chalk.red.bold('*')} ${p}\n`;
    });

    console.error(message);
    process.exit(1);
  }

  const { useNpm } = program.opts();

  await createApp({ appPath: resolvedPath, useNpm: !!useNpm });
})()
  .then(notifyUpdate)
  .catch(async (reason) => {
    console.log();
    console.log('Aborting installation.');
    if (reason.command) {
      console.log(`  ${chalk.cyan(reason.command)} has failed.`);
    } else {
      console.log(chalk.red('Unexpected error. Please report it as a bug:'));
      console.log(reason);
    }
    console.log();

    await notifyUpdate();

    process.exit(1);
  });
