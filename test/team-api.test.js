import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/team.js";

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

test("rejects unsupported methods before processing team requests", async () => {
  const response = await invoke({ method: "GET", headers: {} });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
});

test("rejects team requests without a trusted origin", async () => {
  const response = await invoke({ method: "POST", headers: {} });
  assert.equal(response.statusCode, 403);
});

test("requires an authenticated session before accessing team data", async () => {
  const previousAppUrl = process.env.APP_URL;
  delete process.env.APP_URL;
  try {
    const response = await invoke({
      method: "POST",
      headers: { origin: "http://127.0.0.1:5173" },
      body: { action: "list", store_id: "7cfc1d36-9a49-4b2a-86da-b932de56cdf0" }
    });
    assert.equal(response.statusCode, 401);
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
  }
});

test("rejects malformed team payloads", async () => {
  const response = await invoke({
    method: "POST",
    headers: { origin: "http://127.0.0.1:5173", authorization: "Bearer test-token" },
    body: { action: "update-role", store_id: "not-a-store", user_id: "not-a-user", role: "owner" }
  });
  assert.equal(response.statusCode, 400);
});

test("reports missing server configuration explicitly", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const previousValues = Object.fromEntries(names.map(name => [name, process.env[name]]));
  names.forEach(name => delete process.env[name]);
  try {
    const response = await invoke({
      method: "POST",
      headers: { origin: "http://127.0.0.1:5173", authorization: "Bearer test-token" },
      body: { action: "list", store_id: "7cfc1d36-9a49-4b2a-86da-b932de56cdf0" }
    });
    assert.equal(response.statusCode, 503);
  } finally {
    names.forEach(name => {
      if (previousValues[name] === undefined) delete process.env[name];
      else process.env[name] = previousValues[name];
    });
  }
});
