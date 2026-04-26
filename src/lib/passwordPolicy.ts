interface PasswordContext {
  email?: string;
  username?: string;
  name?: string;
}

interface PasswordRule {
  label: string;
  test: (password: string, context?: PasswordContext) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    label: 'At least 8 characters',
    test: password => password.length >= 8,
  },
  {
    label: 'Uppercase and lowercase letters',
    test: password => /[A-Z]/.test(password) && /[a-z]/.test(password),
  },
  {
    label: 'At least one number',
    test: password => /\d/.test(password),
  },
  {
    label: 'At least one special character',
    test: password => /[^A-Za-z0-9]/.test(password),
  },
  {
    label: 'No spaces',
    test: password => !/\s/.test(password),
  },
  {
    label: 'Does not include your name, username, or email',
    test: (password, context = {}) => {
      const lowered = password.toLowerCase();
      const personalParts = [
        context.email?.split('@')[0],
        context.username,
        context.name,
      ].filter((part): part is string => !!part && part.trim().length >= 3);

      return !personalParts.some(part => lowered.includes(part.trim().toLowerCase()));
    },
  },
];

export function getPasswordIssues(password: string, context?: PasswordContext): string[] {
  return PASSWORD_RULES
    .filter(rule => !rule.test(password, context))
    .map(rule => rule.label);
}

export function isStrongPassword(password: string, context?: PasswordContext): boolean {
  return getPasswordIssues(password, context).length === 0;
}
