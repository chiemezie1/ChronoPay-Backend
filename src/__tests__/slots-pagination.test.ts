import request from "supertest";
import app from "../index";

describe("GET /api/v1/slots pagination", () => {
  it("returns default page and limit shape", async () => {
    const res = await request(app).get("/api/v1/slots");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("validates non-numeric params", async () => {
    const res = await request(app).get("/api/v1/slots?page=abc&limit=ten");
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

  it("returns empty data for page beyond total", async () => {
    const resTotal = await request(app).get("/api/v1/slots?limit=10&page=1000");
    expect(resTotal.status).toBe(200);
    expect(Array.isArray(resTotal.body.data)).toBe(true);
    expect(resTotal.body.data.length).toBe(0);
  });
});
