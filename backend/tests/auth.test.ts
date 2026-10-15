import { describe, it } from "vitest";

import { anonymous, createUser, expectStatus } from "./helpers.js";

describe("auth rules", () => {
  it("refuses to sign up an admin", async () => {
    const res = await anonymous()
      .post("/api/auth/sign-up/email")
      .set("Origin", process.env.FRONTEND_URL!)
      .send({
        name: "Sneaky",
        email: `sneaky-${Date.now()}@test.local`,
        password: "Test#123456",
        role: "admin",
      });

    expectStatus(res, 400);
  });

  // Demo accounts are shared, so nobody may change their password or profile.
  it.each([
    ["/api/auth/change-password", { currentPassword: "Test#123456", newPassword: "Hacked#123456" }],
    ["/api/auth/update-user", { name: "Hacked" }],
  ])("disables %s", async (path, body) => {
    const user = await createUser("student");

    const res = await user.agent.post(path).set("Origin", process.env.FRONTEND_URL!).send(body);

    expectStatus(res, 404);
  });
});
