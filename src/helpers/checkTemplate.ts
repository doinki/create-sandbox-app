import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getTemplates = (): string[] => {
  try {
    return readdirSync(join(__dirname, '..', '..', 'templates'));
  } catch {
    return [];
  }
};

const checkTemplate = (template: string): boolean => {
  return getTemplates().includes(template);
};

export default checkTemplate;
