// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import veerGrammar from './veer.tmLanguage.json' with { type: 'json' };

export default defineConfig({
	markdown: { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] },
	site: process.env.SITE_URL || 'https://veer-lang.vercel.app',
	integrations: [
		starlight({
			title: 'Veer',
			description: 'A language where LLM contexts are typed, linear values and the compiler proves KV-cache memory, cost, and numeric accuracy.',
			logo: { src: './src/assets/logo.svg', replacesTitle: false },
			favicon: '/favicon.svg',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/veermshah/veer-site' }],
			editLink: { baseUrl: 'https://github.com/veermshah/veer-site/edit/main/' },
			customCss: ['katex/dist/katex.min.css', './src/styles/custom.css'],
			expressiveCode: { shiki: { langs: [veerGrammar] } },
			lastUpdated: true,
			sidebar: [
				{ label: 'Download', link: '/download/' },
				{ label: 'Playground', link: '/playground/' },
				{
					label: 'Start here',
					items: [
						{ label: 'Installation', slug: 'start/installation' },
						{ label: 'Quickstart', slug: 'start/quickstart' },
						{ label: 'Why Veer?', slug: 'start/why-veer' },
					],
				},
				{
					label: 'Learn the background',
					items: [
						{ label: 'Overview', slug: 'learn' },
						{ label: '1. How LLMs generate text', slug: 'learn/llm-inference' },
						{ label: '2. The KV cache', slug: 'learn/kv-cache' },
						{ label: '3. Serving systems', slug: 'learn/serving' },
						{ label: '4. Agents and context editing', slug: 'learn/agents' },
						{ label: '5. Number formats and quantization', slug: 'learn/number-formats' },
						{ label: '6. Error analysis', slug: 'learn/error-analysis' },
						{ label: '7. Types, linearity, and static analysis', slug: 'learn/type-systems' },
						{ label: 'Glossary', slug: 'learn/glossary' },
					],
				},
				{
					label: 'Tutorial',
					items: [
						{ label: '1. Contexts', slug: 'tutorial/contexts' },
						{ label: '2. Forking and sharing', slug: 'tutorial/fork' },
						{ label: '3. Structured generation', slug: 'tutorial/structured' },
						{ label: '4. Editing contexts with splice', slug: 'tutorial/splice' },
						{ label: '5. Speculation', slug: 'tutorial/speculate' },
						{ label: '6. Loops, functions, and budgets', slug: 'tutorial/budgets' },
						{ label: '7. Precision types', slug: 'tutorial/precision' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Syntax', slug: 'reference/syntax' },
						{ label: 'Types', slug: 'reference/types' },
						{ label: 'Linearity rules', slug: 'reference/linearity' },
						{ label: 'Context operations', slug: 'reference/contexts' },
						{ label: 'The planner', slug: 'reference/planner' },
						{ label: 'Precision layer', slug: 'reference/precision' },
						{ label: 'Builtins', slug: 'reference/builtins' },
						{ label: 'CLI', slug: 'reference/cli' },
						{ label: 'Engines', slug: 'reference/engines' },
						{ label: 'Limitations and roadmap', slug: 'reference/limitations' },
					],
				},
				{ label: 'Cookbook', items: [{ autogenerate: { directory: 'cookbook' } }] },
				{ label: 'Research and motivation', slug: 'research' },
				{ label: 'Error index', items: [{ autogenerate: { directory: 'errors' } }] },
			],
		}),
	],
});
