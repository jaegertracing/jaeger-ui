// eslint.config.js (ESLint v9+ with Prettier)
import js from '@eslint/js';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import jestPlugin from 'eslint-plugin-jest';

export default [
  js.configs.recommended,

  // Global ignores for build artifacts and generated files
  {
    ignores: [
      'packages/*/dist/**',
      'packages/*/lib/**',
      'packages/*/build/**',
      '**/*.d.ts', // Ignore all TypeScript declaration files
      '**/node_modules/**',
      '**/.git/**',
      '**/.DS_Store',
      '**/coverage/**',
      '**/tsconfig.tsbuildinfo',
      '**/index.tsbuildinfo',
      '**/layout.worker.bundled.js', // Ignore bundled worker files
    ],
  },

  // Node.js scripts files (CommonJS)
  {
    files: ['scripts/**/*.js'],
    ignores: ['scripts/utils/parse-traces.js', 'scripts/check-license.js', 'scripts/run-depcheck.js'], // These use ES modules
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': typescriptPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-undef': 'off',
      'no-console': 'off',
      'import/no-extraneous-dependencies': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
    },
  },

  // ES Module scripts files
  {
    files: ['scripts/utils/parse-traces.js', 'scripts/check-license.js', 'scripts/run-depcheck.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-console': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },

  // Additional Node.js files (webpack, babel, jest configs)
  {
    files: ['packages/*/webpack*.js', 'packages/*/babel*.js', 'packages/*/.eslintrc.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': typescriptPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-undef': 'off',
      'no-console': 'off',
      'import/no-extraneous-dependencies': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // Jest setup files (ES modules)
  {
    files: ['packages/*/test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        // Browser globals for test environment
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': typescriptPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-undef': 'off',
      'no-console': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },

  // Test files (Jest)
  {
    files: ['**/*.test.js', '**/*.test.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        // Additional browser/test globals
        global: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        performance: 'readonly',
        SVGElement: 'readonly',
        Element: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // Additional test environment globals
        require: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        React: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-filename-extension': 'off',
      'react/prop-types': 'off',
      'import/prefer-default-export': 'off',
      'import/no-named-default': 'off',
      'import/extensions': 'off',
    },
  },

  // JS / JSX files (browser code)
  {
    files: ['**/*.js', '**/*.jsx'],
    ignores: [
      'scripts/**/*.js',
      'packages/*/webpack*.js',
      'packages/*/babel*.js',
      'packages/*/.eslintrc.js',
      'packages/*/test/**/*.js',
      '**/*.test.js',
      '**/*.test.jsx',
    ], // Exclude Node.js scripts and test files
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        // Additional browser globals
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        performance: 'readonly',
        SVGElement: 'readonly',
        Element: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // App-specific globals
        __APP_ENVIRONMENT__: 'readonly',
        __REACT_APP_VSN_STATE__: 'readonly',
        __REACT_APP_GA_DEBUG__: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Prettier formatting
      'prettier/prettier': ['error'],

      // General JS rules
      'arrow-body-style': 'off',
      'arrow-parens': ['warn', 'as-needed'],
      'class-methods-use-this': 'off',
      'comma-dangle': 'off',
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'no-continue': 'off',
      'no-plusplus': 'off',
      'no-self-compare': 'off',
      'no-underscore-dangle': 'off',
      'prefer-destructuring': 'off',
      'no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // React
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-filename-extension': 'off',
      'react/forbid-prop-types': 'warn',
      'react/function-component-definition': 'off',
      'react/require-default-props': 'warn',
      'react/no-array-index-key': 'warn',
      'react/no-unused-class-component-methods': 'off',
      'react/sort-comp': [
        'error',
        {
          order: [
            'type-annotations',
            'defaultProps',
            'statics',
            'state',
            'propTypes',
            'static-methods',
            'instance-variables',
            'constructor',
            'lifecycle',
            'everything-else',
            '/^on.+$/',
            'render',
          ],
        },
      ],

      // JSX A11y
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/href-no-hash': 'off',
      'jsx-a11y/interactive-supports-focus': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/mouse-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/control-has-associated-label': 'off',

      // Relaxed rules from Airbnb
      'react/jsx-props-no-spreading': 'off',
      'react/state-in-constructor': 'off',
      'react/static-property-placement': 'off',
      'react/jsx-fragments': 'off',
      'react/prop-types': 'off',
      'max-classes-per-file': 'off',
      'no-restricted-exports': ['error', { restrictedNamedExports: ['then'] }],
      'prefer-arrow-callback': 'off',
      'prefer-object-spread': 'off',

      // Import
      'import/prefer-default-export': 'warn',
      'import/no-named-default': 'off',
      'import/extensions': 'off',
    },
  },

  // Web Worker files
  {
    files: ['**/*.worker.js', '**/*.worker.bundled.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        self: 'readonly',
        importScripts: 'readonly',
        postMessage: 'readonly',
        onmessage: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
    },
  },

  // TS / TSX files
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['packages/plexus/demo/**/*.tsx', '**/*.d.ts', '**/vite.config.ts', '**/vite-env.d.ts'], // Exclude build tooling files
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        project: ['./packages/jaeger-ui/tsconfig.json', './packages/plexus/tsconfig.json'],
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        process: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        React: 'readonly',
        self: 'readonly',
        // Additional browser globals
        global: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        performance: 'readonly',
        SVGElement: 'readonly',
        Element: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // JSX namespace for TypeScript
        JSX: 'readonly',
        // App-specific globals
        __APP_ENVIRONMENT__: 'readonly',
        __REACT_APP_VSN_STATE__: 'readonly',
        __REACT_APP_GA_DEBUG__: 'readonly',
        // Jest globals for TS test files
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      'prettier/prettier': ['error'],

      // Turn off base ESLint rules that conflict with TypeScript rules
      'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
      'no-redeclare': 'off', // Use @typescript-eslint/no-redeclare instead
      'no-shadow': 'off', // Use @typescript-eslint/no-shadow instead
      'no-use-before-define': 'off', // Use @typescript-eslint/no-use-before-define instead
      'no-useless-constructor': 'off', // Use @typescript-eslint/no-useless-constructor instead

      // TS-specific rules
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I'],
        },
      ],
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-use-before-define': 'warn',
      '@typescript-eslint/no-redeclare': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-restricted-types': 'warn',
      '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-useless-constructor': 'warn', // From old plexus config

      // React rules for TypeScript files
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-filename-extension': 'off',
      'react/prop-types': 'off',

      // JSX A11y rules for TypeScript files
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/control-has-associated-label': 'off',
    },
  },

  // Demo TypeScript files (without type checking)
  {
    files: ['packages/plexus/demo/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-unused-vars': 'off', // Turn off base rule for TypeScript files
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-filename-extension': 'off',
      'react/prop-types': 'off',
    },
  },

  // TypeScript declaration files
  {
    files: ['**/*.d.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      globals: {
        Window: 'readonly',
        React: 'readonly',
        CombokeysHandler: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
    },
  },
];
