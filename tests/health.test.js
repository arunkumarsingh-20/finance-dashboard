const request = require("supertest");
const app = require("../src/app");

describe("Health Check", () => {
  it("returns status", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("Finance API running");
  });
});
