import assert from "assert";
import { getDocumentPath } from "../../server/utils/document";

describe("Utils/Document", () => {
	it("getDocumentPath", () => {
		assert.strictEqual(
			getDocumentPath("test/file.scss", "test/includes/a.scss"),
			"includes/a.scss",
		);
		assert.strictEqual(
			getDocumentPath("test/includes/a.scss", "test/file.scss"),
			"../file.scss",
		);
	});
});
