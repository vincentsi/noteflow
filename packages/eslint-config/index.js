module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // TypeScript strict rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // JavaScript general rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all']
  },
  overrides: [
    {
      // Specific configuration for React/Next.js files
      files: ['*.tsx', '*.jsx'],
      env: {
        browser: true,
        es2022: true
      },
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'prettier'
      ],
      rules: {
        'no-console': 'off' // Allow console in frontend for debugging
      }
    }
  ]
}