import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/delete-account.js";

async function invoke(request) {
  const response = {
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = JSON.parse(body);
    }
  };
  await handler(request, response);
  return response;
}

test("rejects unsupported methods before processing a deletion", async () => {
  const response = await invoke({ method: "GET", headers: {} });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
});

test("rejects requests without a trusted origin", async () => {
  const response = await invoke({ method: "POST", headers: {} });
  assert.equal(response.statusCode, 403);
});

test("requires an authenticated session for deletion requests", async () => {
  const previousAppUrl = process.env.APP_URL;
  delete process.env.APP_URL;
  try {
    const response = await invoke({
      method: "POST",
      headers: { origin: "http://127.0.0.1:5173" },
      body: { action: "delete-account", confirmation: "person@example.com" }
    });
    assert.equal(response.statusCode, 401);
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
  }
});
