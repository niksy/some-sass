import { getDocUri, showFile, position, sleepCI } from "../util";
import { testHover } from "./helper";

describe("SCSS Hover Test", function () {
	const docUri = getDocUri("hover/main.scss");
	const vueDocUri = getDocUri("hover/AppButton.vue");
	const svelteDocUri = getDocUri("hover/AppButton.svelte");
	const astroDocUri = getDocUri("hover/AppButton.astro");

	before(async () => {
		await showFile(docUri);
		await showFile(vueDocUri);
		await showFile(svelteDocUri);
		await showFile(astroDocUri);
		await sleepCI();
	});

	it("shows hover for variables", async () => {
		const expectedContents = {
			contents: [
				"```scss\n$variable: 'value';\n```\n____\nVariable declared in _variables.scss",
			],
		};

		await testHover(docUri, position(6, 13), expectedContents);
		await testHover(vueDocUri, position(15, 13), expectedContents);
		await testHover(svelteDocUri, position(9, 15), expectedContents);
		await testHover(astroDocUri, position(12, 15), expectedContents);
	});

	it("shows hover for functions", async () => {
		const expectedContents = {
			contents: [
				"```scss\n@function function()\n```\n____\nFunction declared in _functions.scss",
			],
		};

		await testHover(docUri, position(6, 24), expectedContents);
		await testHover(vueDocUri, position(15, 24), expectedContents);
		await testHover(svelteDocUri, position(9, 26), expectedContents);
		await testHover(astroDocUri, position(12, 26), expectedContents);
	});

	it("shows hover for mixins", async () => {
		const expectedContents = {
			contents: [
				"```scss\n@mixin mixin()\n```\n____\nMixin declared in _mixins.scss",
			],
		};

		await testHover(docUri, position(8, 12), expectedContents);
		await testHover(vueDocUri, position(17, 12), expectedContents);
		await testHover(svelteDocUri, position(11, 14), expectedContents);
		await testHover(astroDocUri, position(14, 14), expectedContents);
	});

	it("shows hover for symbol behind namespace", async () => {
		const expectedContents = {
			contents: [
				"```scss\n$var-var-variable: 'value';\n```\n____\nVariable declared in _variables.scss",
			],
		};

		await testHover(docUri, position(14, 14), expectedContents);
		await testHover(vueDocUri, position(23, 14), expectedContents);
		await testHover(svelteDocUri, position(17, 14), expectedContents);
		await testHover(astroDocUri, position(20, 14), expectedContents);
	});

	it("shows hover for symbol behind namespace and prefix", async () => {
		// Prefixed symbols are shown with their original names
		const expectedContents = {
			contents: [
				"```scss\n@mixin mix-mixin()\n```\n____\nMixin declared in _mixins.scss",
			],
		};

		await testHover(docUri, position(15, 17), expectedContents);
		await testHover(vueDocUri, position(24, 17), expectedContents);
		await testHover(svelteDocUri, position(18, 17), expectedContents);
		await testHover(astroDocUri, position(21, 17), expectedContents);
	});

	it("shows hover for SassDoc annotations", async () => {
		// Prefixed symbols are shown with their original names
		const expectedContents = {
			contents: [
				"@type\n____\n[SassDoc reference](http://sassdoc.com/annotations/#type)",
			],
		};

		await testHover(docUri, position(19, 6), expectedContents);

		const expectedEmpty = {
			contents: [""],
		};

		await testHover(docUri, position(19, 5), expectedEmpty);
	});

	it("shows hover for Sass built-in", async () => {
		// Prefixed symbols are shown with their original names
		const expectedContents = {
			contents: [
				"Rounds down to the nearest whole number.\n\n[Sass reference](https://sass-lang.com/documentation/modules/math#floor)",
			],
		};

		await testHover(docUri, position(25, 22), expectedContents);
	});
});
