module.exports = {
	env: {
		browser: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'xo',
		// 'plugin:@typescript-eslint/recommended',
	],
	ignorePatterns: [ '**/vendor/*' ],
	root: true,
	parser: '@babel/eslint-parser',
	// parser: '@typescript-eslint/parser',
	plugins: [
		// '@typescript-eslint',
	],
	parserOptions: {
		ecmaVersion: 13,
		// SourceType: "module",
		ecmaFeatures: {
			jsx: true,
		},
		requireConfigFile: false,
	},
	rules: {
		'array-bracket-spacing': [
			'error',
			'always',
		],
		'capitalized-comments': 0,
		'padded-blocks': [
			'error',
			{
				blocks: 'always',
				switches: 'always',
				classes: 'always',
			},
		],
		'padding-line-between-statements': [
			'error',
			{
				blankLine: 'always',
				prev: 'multiline-block-like',
				next: '*',
			},
			{
				blankLine: 'always',
				prev: '*',
				next: 'return',
			},
		],
		'object-curly-spacing': [
			'error',
			'always',
		],
		semi: [
			2,
			'never',
		],
		'sort-imports': [ 'error', {
			ignoreCase: false,
			ignoreDeclarationSort: false,
			ignoreMemberSort: false,
			memberSyntaxSortOrder: [ 'none', 'all', 'multiple', 'single' ],
			allowSeparatedGroups: false,
		} ],
		'space-in-parens': [
			'error',
			'always',
		],
	},
}
