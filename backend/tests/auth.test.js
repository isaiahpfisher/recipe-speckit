/**
 * Feature 1 — User Authentication and Session Management
 * Spec: features/feature-1-user-authentication-session-management.md
 */

const request = require("supertest");
const mysql = require("mysql2/promise");
const app = require("../server");
const db = require("../app/models");
const { hashPassword } = require("../app/authentication/crypto");

function uniqueEmail(prefix = "user") {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || "password1";
  const body = {
    firstName: overrides.firstName || "Jane",
    lastName: overrides.lastName || "Doe",
    email,
    password,
  };
  const res = await request(app).post("/recipeapi/users").send(body);
  return { res, email, password, body };
}

async function loginUser(email, password) {
  return request(app).post("/recipeapi/login").auth(email, password);
}

describe("Feature 1 — User Authentication and Session Management", () => {
  beforeAll(async () => {
    if (!process.env.SECRET_KEY) {
      throw new Error("SECRET_KEY is missing. Set it in backend/.env.test");
    }
    const admin = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PW,
    });
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await admin.end();
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });
  });

  beforeEach(async () => {
    await db.recipeIngredient.destroy({ where: {}, force: true });
    await db.recipeStep.destroy({ where: {}, force: true });
    await db.recipe.destroy({ where: {}, force: true });
    await db.session.destroy({ where: {}, force: true });
    await db.user.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-1.1 — Create account", () => {
    it("User registers with valid information", async () => {
      const { res, email, password, body } = await registerUser();

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(email);
      expect(res.body.firstName).toBe(body.firstName);
      expect(res.body.lastName).toBe(body.lastName);
      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.password).toBeUndefined();
      expect(res.body.salt).toBeUndefined();

      const stored = await db.user.findByPk(res.body.id);
      expect(stored).not.toBeNull();
      const hash = await hashPassword(password, stored.salt);
      expect(Buffer.compare(Buffer.from(stored.password), Buffer.from(hash))).toBe(
        0
      );

      const session = await db.session.findOne({ where: { userId: stored.id } });
      expect(session).not.toBeNull();
    });

    it("User registers with a duplicate email", async () => {
      const email = "jane@example.com";
      const first = await registerUser({ email });
      expect(first.res.status).toBe(200);

      const second = await registerUser({ email });
      expect(second.res.status).toBe(400);
      expect(second.res.body).toEqual({
        message: "This email is already in use.",
      });
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("User logs in with valid credentials", async () => {
      const { email, password, res: created } = await registerUser();
      expect(created.status).toBe(200);

      const res = await loginUser(email, password);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(email);
      expect(res.body.firstName).toBe("Jane");
      expect(res.body.lastName).toBe("Doe");
      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.password).toBeUndefined();

      const sessions = await db.session.findAll({ where: { userId: res.body.id } });
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it("User logs in with an unknown email", async () => {
      const res = await loginUser("missing@example.com", "password1");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "User not found!" });
    });

    it("User logs in with an invalid password", async () => {
      const { email } = await registerUser({
        email: "jane@example.com",
        password: "password1",
      });

      const res = await loginUser(email, "wrong-password");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Invalid password!" });
    });
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Protected API request succeeds with a valid session", async () => {
      const userA = await registerUser({
        email: uniqueEmail("a"),
        firstName: "Ada",
      });
      const userB = await registerUser({
        email: uniqueEmail("b"),
        firstName: "Bea",
      });
      expect(userA.res.status).toBe(200);
      expect(userB.res.status).toBe(200);

      await db.recipe.create({
        name: "A's soup",
        description: "Owned by A",
        servings: 2,
        time: 20,
        isPublished: false,
        userId: userA.res.body.id,
      });
      await db.recipe.create({
        name: "B's stew",
        description: "Owned by B",
        servings: 4,
        time: 40,
        isPublished: false,
        userId: userB.res.body.id,
      });

      const res = await request(app)
        .get(`/recipeapi/recipes/user/${userA.res.body.id}`)
        .set("Authorization", `Bearer ${userA.res.body.token}`);

      expect(res.status).toBe(200);
      const names = res.body.map((recipe) => recipe.name);
      expect(names).toContain("A's soup");
      expect(names).not.toContain("B's stew");
    });

    it("Expired or invalid session token", async () => {
      const { res: created } = await registerUser();
      expect(created.status).toBe(200);

      await db.session.update(
        { expirationDate: new Date("2020-01-01T00:00:00.000Z") },
        { where: { userId: created.body.id } }
      );

      const res = await request(app)
        .get(`/recipeapi/recipes/user/${created.body.id}`)
        .set("Authorization", `Bearer ${created.body.token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized|expired|Invalid/i);
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User logs out", async () => {
      const { res: created } = await registerUser();
      expect(created.status).toBe(200);

      const logout = await request(app)
        .post("/recipeapi/logout")
        .set("Authorization", `Bearer ${created.body.token}`);

      expect(logout.status).toBe(200);

      const sessions = await db.session.findAll({
        where: { userId: created.body.id },
      });
      expect(sessions).toHaveLength(0);

      const protectedRes = await request(app)
        .get(`/recipeapi/recipes/user/${created.body.id}`)
        .set("Authorization", `Bearer ${created.body.token}`);
      expect(protectedRes.status).toBe(401);
    });
  });

  describe("US-1.5 — Protect authenticated APIs and signed-in UI", () => {
    it("Protected API is called without a token", async () => {
      const res = await request(app).get("/recipeapi/recipes/user/1");
      expect(res.status).toBe(401);
    });
  });
});
