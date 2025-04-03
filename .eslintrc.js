module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.json',
		tsconfigRootDir: __dirname,
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint/eslint-plugin', 'unicorn', '@foxglove', 'max-params-no-constructor', 'etc', '@stylistic/js'],
	extends: [
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
		'plugin:@dword-design/import-alias/recommended',
		'plugin:unicorn/recommended'
	],
	root: true,
	env: {
		node: true,
		jest: false,
	},
	ignorePatterns: ['.eslintrc.js'],
	rules: {
		'max-depth': ['error', 2],
		'@typescript-eslint/interface-name-prefix': 'off',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'no-unreachable': 'warn',
		"max-lines-per-function": ["warn", { "skipBlankLines": true, "skipComments": true, "max": 20 }],
		'unicorn/no-null': 'off',
		'unicorn/no-abusive-eslint-disable': 'off',
		'unicorn/prefer-top-level-await': 'off',
		'unicorn/no-array-reduce': 'off',
		'unicorn/switch-case-braces': 'off',
		'unicorn/no-useless-undefined': ["error", { "checkArguments": false }],
		'unicorn/prevent-abbreviations': ['error',
			{
				"replacements": {
					"args": false, // allow args
					"e2e": false, // allow e2e
					"int": false // allow int
				}
			}
		],
		'unicorn/no-array-for-each': 'error',
		"@foxglove/no-boolean-parameters": ["error", { "allowLoneParameter": false }],
		'max-params-no-constructor/max-params-no-constructor': ['error', 2],
		"etc/no-t": "warn",
		"etc/no-commented-out-code": "warn",
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				'args': 'all',
				'argsIgnorePattern': '^_',
				'caughtErrors': 'all',
				'caughtErrorsIgnorePattern': '^_',
				'destructuredArrayIgnorePattern': '^_',
				'varsIgnorePattern': '^_',
				'ignoreRestSiblings': true
			}
		],
		'max-lines': ['warn', 300],
		"@typescript-eslint/switch-exhaustiveness-check": "error",
		"@typescript-eslint/member-ordering": "error",
		"@stylistic/js/max-len": ["error", 80, { "ignoreUrls": true, "ignoreStrings": true, "ignoreTemplateLiterals": true, "ignoreRegExpLiterals": true }],
		"unicorn/no-null": "error",
		"eqeqeq": "error",
	},
	"overrides": [
		{
			"files": ["*.e2e-spec.ts", "*.int-spec.ts", "test/e2e/**", "test/int/**"],
			"rules": {
				"unicorn/prevent-abbreviations": "off",
				"max-lines-per-function": "off",
				"etc/no-commented-out-code": "off",
			}
		},
		{
			"files": ["*.entity.ts"],
			"rules": {
				"@typescript-eslint/member-ordering": "off",
			}
		},
		{
			"files": ["src/database/migrations/**"],
			"rules": {
				"max-lines-per-function": "off",
				"unicorn/prevent-abbreviations": "off",
				"max-lines": "off",
			}
		},
		{
			"files": ["*.spec.ts"],
			"rules": {
				"max-lines-per-function": "off",
				"etc/no-commented-out-code": "off",
				"max-lines": "off",
			}
		},
	],
}; 