import request from "supertest";
import app from "../index";

describe("GET /api/v1/slots cursor pagination", () => {
  it("returns default first page with cursor shape", async () => {
    const res = await request(app).get("/api/v1/slots");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("cursor");
    expect(res.body).toHaveProperty("nextCursor");
    expect(res.body).toHaveProperty("limit");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("validates non-numeric limit param", async () => {
    const res = await request(app).get("/api/v1/slots?limit=ten");
    expect(res.status).toBe(400);
  });

  it("validates limit=0", async () => {
    const res = await request(app).get("/api/v1/slots?limit=0");
    expect(res.status).toBe(400);
  });

  it("validates limit greater than MAX_LIMIT", async () => {
    const res = await request(app).get("/api/v1/slots?limit=101");
    expect(res.status).toBe(400);
  });

  it("returns empty data for cursor beyond total", async () => {
    // craft a cursor that decodes to a startTime/id beyond dataset
    const outOfRange = Buffer.from("9999999:999999").toString("base64");

    const res = await request(app).get(`/api/v1/slots?cursor=${encodeURIComponent(outOfRange)}&limit=10`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});
