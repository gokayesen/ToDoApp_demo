import tseslint from 'typescript-eslint';

export default tseslint.config(
  // A config object combining `ignores` with `rules`/etc. only narrows that
  // object's own scope, not a global ignore (flat-config gotcha) — needs its
  // own ignores-only object to actually exclude dist/** from every config,
  // including tseslint.configs.recommended below.
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
