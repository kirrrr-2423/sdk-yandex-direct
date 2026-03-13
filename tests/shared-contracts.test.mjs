import test from "node:test";
import assert from "node:assert/strict";

import * as sdk from "../dist/index.js";
import * as shared from "../dist/shared/index.js";

test("shared module exports runtime boundaries", () => {
  assert.equal(typeof shared.ensureJsonRpcRequestEnvelope, "function");
  assert.equal(typeof shared.ensureIds, "function");
  assert.equal(typeof shared.ensurePaginationPage, "function");
  assert.equal(typeof shared.parseUnitsUsageHeader, "function");
});

test("root exports shared runtime boundaries", () => {
  assert.equal(typeof sdk.ensureJsonRpcRequestEnvelope, "function");
  assert.equal(typeof sdk.ensureIds, "function");
  assert.equal(typeof sdk.ensurePaginationPage, "function");
  assert.equal(typeof sdk.AdGroupsService, "function");
  assert.equal(typeof sdk.AdImagesService, "function");
  assert.equal(typeof sdk.AgencyClientsService, "function");
  assert.equal(typeof sdk.BidModifiersService, "function");
  assert.equal(typeof sdk.DictionariesService, "function");
  assert.equal(typeof sdk.KeywordBidsService, "function");
  assert.equal(typeof sdk.KeywordsService, "function");
  assert.equal(typeof sdk.SitelinksService, "function");
});

test("ensureJsonRpcRequestEnvelope accepts valid envelope", () => {
  const envelope = sdk.ensureJsonRpcRequestEnvelope({
    method: "get",
    params: { FieldNames: ["Id"] },
  });

  assert.equal(envelope.method, "get");
  assert.deepEqual(envelope.params, { FieldNames: ["Id"] });
});

test("ensureJsonRpcRequestEnvelope rejects malformed inputs", () => {
  assert.throws(
    () => sdk.ensureJsonRpcRequestEnvelope("bad"),
    /request body must be an object/,
  );

  assert.throws(
    () => sdk.ensureJsonRpcRequestEnvelope({ method: "" }),
    /non-empty string/,
  );
});

test("ensureIds validates positive integer IDs", () => {
  assert.deepEqual(sdk.ensureIds([1, 2, 3]), [1, 2, 3]);

  assert.throws(
    () => sdk.ensureIds([1, 0]),
    /positive integer/,
  );
});

test("ensurePaginationPage validates limit and offset boundaries", () => {
  assert.deepEqual(
    sdk.ensurePaginationPage({ Limit: 50, Offset: 0 }),
    { Limit: 50, Offset: 0 },
  );

  assert.throws(
    () => sdk.ensurePaginationPage({ Limit: 0 }),
    /positive integer/,
  );

  assert.throws(
    () => sdk.ensurePaginationPage({ Limit: 10, Offset: -1 }),
    /non-negative integer/,
  );
});

test("parseUnitsUsageHeader parses units metadata safely", () => {
  assert.deepEqual(
    sdk.parseUnitsUsageHeader("1/2/3"),
    { raw: "1/2/3", spent: 1, remaining: 2, limit: 3 },
  );

  assert.deepEqual(
    sdk.parseUnitsUsageHeader("bad/2/nope"),
    { raw: "bad/2/nope", spent: undefined, remaining: 2, limit: undefined },
  );
});
