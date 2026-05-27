import request from "supertest";
import app from "../index";
import { signJwt } from "../utils/jwt";

const TEST_SECRET = "secret-v2";

async function authHeader() {
  const token = await signJwt({ sub: "alice", role: "user" }, TEST_SECRET, { expiresInSec: 60, issuer: "chronopay" });
  return `Bearer ${token}`;
}

describe("Input validation middleware", () => {
  it("should allow valid slot creation", async () => {
    const res = await request(app).post("/api/v1/slots").set("Authorization", await authHeader()).send({
      professional: "alice",
      startTime: 1000,
      endTime: 2000,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("should reject missing professional", async () => {
    const res = await request(app).post("/api/v1/slots").set("Authorization", await authHeader()).send({
      startTime: 1000,
      endTime: 2000,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject missing startTime", async () => {
    const res = await request(app).post("/api/v1/slots").set("Authorization", await authHeader()).send({
      professional: "alice",
      endTime: 2000,
    });

    expect(res.status).toBe(400);
  });

  it("should reject empty values", async () => {
    const res = await request(app).post("/api/v1/slots").set("Authorization", await authHeader()).send({
      professional: "",
      startTime: 1000,
      endTime: 2000,
    });

    expect(res.status).toBe(400);
  });
});