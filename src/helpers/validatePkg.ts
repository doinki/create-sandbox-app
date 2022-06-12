import validateProjectName from 'validate-npm-package-name';

const validatePkg = (name: string): { valid: boolean; problems?: string[] } => {
  const {
    validForNewPackages,
    errors = [],
    warnings = [],
  } = validateProjectName(name);

  if (validForNewPackages) {
    return { valid: true };
  }

  return {
    valid: false,
    problems: [...errors, ...warnings],
  };
};

export default validatePkg;
