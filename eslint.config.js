import babelParser from '@babel/eslint-parser'
import js from '@eslint/js'

export default [
	{
		ignores: [
			'**/vendor/**',
			'**/*.min.js',
			'dist/',
			'build/',
			'node_modules/',
		],
	},
	{
		...js.configs.recommended,
		languageOptions: {
			parser: babelParser,
			parserOptions: {
				ecmaVersion: 13,
				ecmaFeatures: {
					jsx: true,
				},
				requireConfigFile: false,
			},
			globals: {
				console: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				module: 'readonly',
				require: 'readonly',
				exports: 'readonly',
				global: 'readonly',
				window: 'readonly',
				document: 'readonly',
				navigator: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				requestAnimationFrame: 'readonly',
				cancelAnimationFrame: 'readonly',
				URL: 'readonly',
				XMLHttpRequest: 'readonly',
				DOMParser: 'readonly',
				HTMLElement: 'readonly',
				HTMLCollection: 'readonly',
				NodeList: 'readonly',
				Element: 'readonly',
				Event: 'readonly',
				define: 'readonly',
				self: 'readonly',
			},
		},
		rules: {
			'array-bracket-newline': [
				'error',
				{
					multiline: true,
					minItems: 3,
				},
			],
			'array-bracket-spacing': [
				'error',
				'always',
			],
			'capitalized-comments': 0,
			indent: [
				'error',
				'tab',
			],
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
			'sort-imports': [
				'error',
				{
					ignoreCase: false,
					ignoreDeclarationSort: false,
					ignoreMemberSort: false,
					memberSyntaxSortOrder: [
						'none',
						'all',
						'multiple',
						'single',
					],
					allowSeparatedGroups: false,
				},
			],
			'space-in-parens': [
				'error',
				'always',
			],
		},
	},
]
