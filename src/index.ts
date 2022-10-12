#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

import createApp from './createApp';
import getPkgManager from './helpers/getPkgManager';
import notifyUpdate from './helpers/notifyUpdate';
import validateProjectName from './helpers/validatePkg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')
) as { name: string; version: string };

const program = new Command(packageJson.name);
let projectPath = '';

program
  .version(packageJson.version)
  .argument('[project-directory]')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .action((name) => {
    projectPath = name;
  })
  .option(
    '--use-npm',
    `

  Explicitly tell the CLI to bootstrap the app using npm
`
  )
  .option(
    '--use-pnpm',
    `

  Explicitly tell the CLI to bootstrap the app using pnpm
`
  )
  .option(
    '--template <name>',
    `

    A template to bootstrap the app with.
`
  )
  .allowUnknownOption()
  .parse(process.argv);

(async () => {
  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim();
  }

  if (!projectPath) {
    const { path } = await prompts({
      initial: 'my-app',
      message: 'What is your project named?',
      name: 'path',
      type: 'text',
      validate: (name: string) => {
        const { problems = [], valid } = validateProjectName(
          basename(resolve(name))
        );

        return valid ? true : `Invalid project name: ${problems[0]}`;
      },
    });

    if (typeof path === 'string') {
      projectPath = path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      `\nPlease specify the project directory:
  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}
For example:
  ${chalk.cyan(program.name())} ${chalk.green('my-app')}

Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );

    process.exit(1);
  }

  const resolvedProjectPath = resolve(projectPath);
  const projectName = basename(resolvedProjectPath);

  const { problems = [], valid } = validateProjectName(projectName);

  if (!valid) {
    console.error(
      problems.reduce(
        (prev, curr) => `${prev}    ${chalk.red.bold('*')} ${curr}\n`,
        `Could not create a project called ${chalk.red(
          `"${projectName}"`
        )} because of npm naming restrictions:\n`
      )
    );

    process.exit(1);
  }

  const packageManager = program.getOptionValue('useNpm')
    ? 'npm'
    : program.getOptionValue('usePnpm')
    ? 'pnpm'
    : getPkgManager();

  await createApp({
    appPath: resolvedProjectPath,
    packageManager,
    template: program.getOptionValue('template'),
  });
})()
  .then(() => notifyUpdate(packageJson))
  .catch(async (reason: Error | { command: string }) => {
    let message = '\nAborting installation.\n';

    if ('command' in reason) {
      message += `  ${chalk.cyan(reason.command)} has failed.`;
    } else {
      message += `${chalk.red(
        'Unexpected error. Please report it as a bug:'
      )}\n${reason.message}\n`;
    }

    console.log(message);

    await notifyUpdate(packageJson);

    process.exit(1);
  });
