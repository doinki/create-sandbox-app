import chalk from 'chalk';
import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const isFolderEmpty = (root: string, name: string): boolean => {
  const validFiles = [
    '.DS_Store',
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
    '.yarn',
    'LICENSE',
    'Thumbs.db',
    'docs',
    'mkdocs.yml',
    'npm-debug.log',
    'yarn-debug.log',
    'yarn-error.log',
    'yarnrc.yml',
  ];

  const conflicts = readdirSync(root)
    .filter((file) => !validFiles.includes(file))
    .filter((file) => !/\.iml$/.test(file));

  if (conflicts.length === 0) {
    return true;
  }

  console.log(
    `The directory ${chalk.green(name)} contains files that could conflict:\n`
  );

  for (const file of conflicts) {
    try {
      if (lstatSync(join(root, file)).isDirectory()) {
        console.log(`  ${chalk.blue(file)}/`);
      } else {
        console.log(`  ${file}`);
      }
    } catch {
      console.log(`  ${file}`);
    }
  }

  console.log(
    '\nEither try using a new directory name, or remove the files listed above.\n'
  );

  return false;
};

export default isFolderEmpty;
