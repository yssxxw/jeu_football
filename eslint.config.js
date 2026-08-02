import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// ZONE PURE : le moteur n'importe rien de Svelte, ne touche ni au DOM,
		// ni au stockage, ni au réseau, ni à Math.random. Voir docs/05-architecture.md §2.
		files: ['src/lib/moteur/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{ patterns: ['$app/*', 'svelte*', '$lib/ui/*', '$lib/etat/*'] }
			],
			'no-restricted-globals': [
				'error',
				'window',
				'document',
				'localStorage',
				'navigator',
				'fetch'
			],
			'no-restricted-properties': [
				'error',
				{ object: 'Math', property: 'random', message: 'PRNG seedé uniquement.' }
			]
		}
	}
);
