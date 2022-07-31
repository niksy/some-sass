import { TextDocument } from "vscode-languageserver-textdocument";
import {
	createConnection,
	TextDocuments,
	TextDocumentSyncKind,
	ProposedFeatures,
} from "vscode-languageserver/node";
import type {
	Connection,
	InitializeParams,
	InitializeResult,
} from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import { doCompletion } from "./providers/completion";
import { doDiagnostics } from "./providers/diagnostics";
import { goDefinition } from "./providers/go-definition";
import { doHover } from "./providers/hover";
import { provideReferences } from "./providers/references";
import { doSignatureHelp } from "./providers/signature-help";
import { searchWorkspaceSymbol } from "./providers/workspace-symbol";
import ScannerService from "./services/scanner";
import StorageService from "./services/storage";
import type { ISettings } from "./types/settings";
import { getSCSSRegionsDocument } from "./utils/embedded";
import { findFiles } from "./utils/fs";

interface InitializationOption {
	workspace: string;
	settings: ISettings;
}

let workspaceRoot: URI;
let settings: ISettings;
let storageService: StorageService;
let scannerService: ScannerService;

// Create a connection for the server
const connection: Connection = createConnection(ProposedFeatures.all);

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

// Create a simple text document manager. The text document manager
// _supports full document sync only
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// _for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// _in the passed params the rootPath of the workspace plus the client capabilites
connection.onInitialize(
	async (params: InitializeParams): Promise<InitializeResult> => {
		const options = params.initializationOptions as InitializationOption;

		workspaceRoot = URI.file(options.workspace);
		settings = options.settings;

		storageService = new StorageService();
		scannerService = new ScannerService(storageService, settings);

		const files = await findFiles("**/*.{scss,svelte,astro,vue}", {
			cwd: workspaceRoot.fsPath,
			deep: settings.scannerDepth,
			ignore: settings.scannerExclude,
		});

		try {
			await scannerService.scan(files, workspaceRoot);
		} catch (error) {
			if (settings.showErrors) {
				connection.window.showErrorMessage(String(error));
			}
		}

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				referencesProvider: true,
				completionProvider: {
					resolveProvider: false,
					triggerCharacters: [
						// For SassDoc annotation completion
						"@",
						" ",
						"/",

						// For @use completion
						'"',
						"'",
					],
				},
				signatureHelpProvider: {
					triggerCharacters: ["(", ",", ";"],
				},
				hoverProvider: true,
				definitionProvider: true,
				workspaceSymbolProvider: true,
			},
		};
	},
);

documents.onDidChangeContent(async (change) => {
	try {
		await scannerService.update(change.document, workspaceRoot);
	} catch (error) {
		// Something went wrong trying to parse the changed document.
		console.error((error as Error).message);
		return;
	}

	const diagnostics = await doDiagnostics(change.document, storageService);

	// Check that no new version has been made while we waited
	const latestTextDocument = documents.get(change.document.uri);
	if (
		latestTextDocument &&
		latestTextDocument.version === change.document.version
	) {
		connection.sendDiagnostics({ uri: latestTextDocument.uri, diagnostics });
	}
});

connection.onDidChangeConfiguration((params) => {
	settings = params.settings.somesass;
});

connection.onDidChangeWatchedFiles((event) => {
	const files = event.changes.map((file) => URI.parse(file.uri).fsPath);
	return scannerService.scan(files, workspaceRoot);
});

connection.onCompletion((textDocumentPosition) => {
	const uri = documents.get(textDocumentPosition.textDocument.uri);
	if (uri === undefined) {
		return;
	}

	const { document, offset } = getSCSSRegionsDocument(
		uri,
		textDocumentPosition.position,
	);
	if (!document) {
		return null;
	}

	return doCompletion(document, offset, settings, storageService);
});

connection.onHover((textDocumentPosition) => {
	const uri = documents.get(textDocumentPosition.textDocument.uri);
	if (uri === undefined) {
		return;
	}

	const { document, offset } = getSCSSRegionsDocument(
		uri,
		textDocumentPosition.position,
	);
	if (!document) {
		return null;
	}

	return doHover(document, offset, storageService);
});

connection.onSignatureHelp((textDocumentPosition) => {
	const uri = documents.get(textDocumentPosition.textDocument.uri);
	if (uri === undefined) {
		return;
	}

	const { document, offset } = getSCSSRegionsDocument(
		uri,
		textDocumentPosition.position,
	);
	if (!document) {
		return null;
	}

	return doSignatureHelp(document, offset, storageService);
});

connection.onDefinition((textDocumentPosition) => {
	const uri = documents.get(textDocumentPosition.textDocument.uri);
	if (uri === undefined) {
		return;
	}

	const { document, offset } = getSCSSRegionsDocument(
		uri,
		textDocumentPosition.position,
	);
	if (!document) {
		return null;
	}

	return goDefinition(document, offset, storageService);
});

connection.onReferences((referenceParams) => {
	const uri = documents.get(referenceParams.textDocument.uri);
	if (uri === undefined) {
		return undefined;
	}

	const { document, offset } = getSCSSRegionsDocument(
		uri,
		referenceParams.position,
	);
	if (!document) {
		return null;
	}

	const options = referenceParams.context;
	return provideReferences(document, offset, storageService, options);
});

connection.onWorkspaceSymbol((workspaceSymbolParams) => {
	return searchWorkspaceSymbol(
		workspaceSymbolParams.query,
		storageService,
		workspaceRoot.toString(),
	);
});

connection.onShutdown(() => {
	storageService.clear();
});

connection.listen();
