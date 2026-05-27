import request from "supertest";
import app from "../index";
import { signJwt } from "../utils/jwt";
import * as jwtConfig from "../config/jwt";

const ACTIVE_SECRET = "secret-v2";
const OLD_SECRET = "secret-v1";

describe("JWT verification middleware", () => {
  it("allows valid token", async () => {
    const token = await signJwt({ sub: "bob", role: "user" }, ACTIVE_SECRET, { expiresInSec: 60, issuer: "chronopay" });
    const res = await request(app).post("/api/v1/slots").set("Authorization", `Bearer ${token}`).send({ professional: "bob", startTime: 1, endTime: 2 });
    expect(res.status).toBe(201);
    expect(res.body.actor).toBeDefined();
    expect(res.body.actor.sub).toBe("bob");
  });

  it("rejects expired token", async () => {
    const token = await signJwt({ sub: "bob" }, ACTIVE_SECRET, { expiresInSec: -10, issuer: "chronopay" });
    const res = await request(app).post("/api/v1/slots").set("Authorization", `Bearer ${token}`).send({ professional: "bob", startTime: 1, endTime: 2 });
    expect(res.status).toBe(401);
  });

  it("rejects wrong signature", async () => {
    const token = await signJwt({ sub: "bob" }, "wrong-secret", { expiresInSec: 60, issuer: "chronopay" });
    const res = await request(app).post("/api/v1/slots").set("Authorization", `Bearer ${token}`).send({ professional: "bob", startTime: 1, endTime: 2 });
    expect(res.status).toBe(401);
  });

  it("rejects missing issuer claim", async () => {
    const token = await signJwt({ sub: "bob" }, ACTIVE_SECRET, { expiresInSec: 60 });
    const res = await request(app).post("/api/v1/slots").set("Authorization", `Bearer ${token}`).send({ professional: "bob", startTime: 1, endTime: 2 });
    expect(res.status).toBe(401);
  });

  it("accepts token signed with rotated secret when that version is active", async () => {
    // token signed with OLD_SECRET
    const token = await signJwt({ sub: "rotated" }, OLD_SECRET, { expiresInSec: 60, issuer: "chronopay" });

    const res = await request(app).post("/api/v1/slots").set("Authorization", `Bearer ${token}`).send({ professional: "rotated", startTime: 1, endTime: 2 });
    expect(res.status).toBe(201);
  });
});
