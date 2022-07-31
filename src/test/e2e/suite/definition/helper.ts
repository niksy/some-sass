import * as assert from "assert";
import * as vscode from "vscode";
import { showFile } from "../util";

export async function testDefinition(
	docUri: vscode.Uri,
	position: vscode.Position,
	expectedLocation: vscode.Location,
) {
	await showFile(docUri);

	const result: any = await vscode.commands.executeCommand(
		"vscode.executeDefinitionProvider",
		docUri,
		position,
	);

	if (result[0] === undefined) {
		assert.fail("The 'result[0]' is undefined.");
	}

	assert.ok(
		result[0].range.isEqual(expectedLocation.range),
		`Expected ${JSON.stringify(result[0].range)} to equal ${JSON.stringify(
			expectedLocation.range,
		)} in ${docUri.fsPath}`,
	);
	assert.strictEqual(result[0].uri.fsPath, expectedLocation.uri.fsPath);
}
