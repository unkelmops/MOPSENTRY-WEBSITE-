import { describe, expect, it, vi } from "vitest";
import { directAccountsApi, directAccountStatus, DirectAccountSignInRequired, pendingDirectAccount } from "../../native-app/src/lib/direct-mt5";

describe("direct MT5 safety rules", () => {
  it("creates only pending investor metadata without credentials or telemetry", () => {
    expect(pendingDirectAccount("owner", " Broker-Demo ", " 001234 ")).toEqual({
      user_id: "owner", platform: "MT5", broker_server: "Broker-Demo", account_login: "001234", access_mode: "investor", connection_status: "pending",
    });
  });
  it("requires a broker server", () => {
    expect(() => pendingDirectAccount("owner", " ", "123")).toThrow();
  });
  it("rejects non-numeric account logins", () => {
    for (const login of ["", "123abc", "12 34", "-123", "1.23"]) {
      expect(() => pendingDirectAccount("owner", "Broker-Demo", login)).toThrow();
    }
  });
  it("pending records cannot be shown connected", () => {
    expect(directAccountStatus({ connection_status: "pending", last_sync_at: null }).confirmed).toBe(false);
  });
  it("requires a real sync timestamp as well as connected status", () => {
    for (const last_sync_at of [null, "invalid", "2027-01-01T00:00:00Z"]) {
      expect(directAccountStatus({ connection_status: "connected", last_sync_at }, Date.parse("2026-11-13T07:28:00Z")).confirmed).toBe(false);
    }
    expect(directAccountStatus({ connection_status: "connected", last_sync_at: "2026-11-13T07:00:00Z" }, Date.parse("2026-11-13T07:28:00Z")).confirmed).toBe(true);
  });
  it("does not treat a disconnected record with sync history as connected", () => {
    expect(directAccountStatus({ connection_status: "disconnected", last_sync_at: "2026-11-13T07:00:00Z" }).confirmed).toBe(false);
  });
});

function fakeClient(userId: string | null = "owner") {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }), delete: vi.fn().mockReturnThis(),
  };
  const from = vi.fn(() => query);
  const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null }, error: null }) }, from } as unknown as Parameters<typeof directAccountsApi>[0];
  return { client, query, from };
}

describe("authenticated direct-account access", () => {
  it("reads only the authenticated owner's direct table", async () => {
    const { client, query, from } = fakeClient();
    await directAccountsApi(client).list();
    expect(from).toHaveBeenCalledExactlyOnceWith("mt5_direct_connections");
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
  });
  it("saves with verified identity, not a form-supplied owner", async () => {
    const { client, query } = fakeClient();
    await directAccountsApi(client).create("Broker-Demo", "123");
    expect(query.insert).toHaveBeenCalledWith(pendingDirectAccount("owner", "Broker-Demo", "123"));
  });
  it("scopes deletion to owner and selected record", async () => {
    const { client, query } = fakeClient();
    query.select.mockResolvedValueOnce({ data: [{ id: "record" }], error: null });
    await directAccountsApi(client).remove("record");
    expect(query.eq.mock.calls).toEqual([["id", "record"], ["user_id", "owner"]]);
    expect(query.delete).toHaveBeenCalledOnce();
  });
  it("requires sign-in before any direct table operation", async () => {
    const { client, from } = fakeClient(null);
    const api = directAccountsApi(client);
    await expect(api.list()).rejects.toBeInstanceOf(DirectAccountSignInRequired);
    await expect(api.create("Broker-Demo", "123")).rejects.toBeInstanceOf(DirectAccountSignInRequired);
    await expect(api.remove("record")).rejects.toBeInstanceOf(DirectAccountSignInRequired);
    expect(from).not.toHaveBeenCalled();
  });
});