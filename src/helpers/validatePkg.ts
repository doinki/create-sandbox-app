import validateProjectName from 'validate-npm-package-name';

const validatePkg = (name: string): { problems?: string[]; valid: boolean } => {
  const {
    validForNewPackages,
    errors = [],
    warnings = [],
  } = validateProjectName(name);

  if (validForNewPackages) {
    return { valid: true };
  }

  return {
    problems: [...errors, ...warnings],
    valid: false,
  };
};

export default validatePkg;
