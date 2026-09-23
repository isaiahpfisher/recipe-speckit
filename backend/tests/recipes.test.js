/**
 * Feature 4 — Recipe Publishing
 * Spec: features/feature-4-recipe-publishing.md
 */

const request = require("supertest");
const mysql = require("mysql2/promise");
const app = require("../server");
const db = require("../app/models");

function assertTestDatabase() {
  const dbName = process.env.DB_NAME || "";
  if (!dbName.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run recipe API tests against DB_NAME "${dbName}". Use backend/.env.test with a test database.`
    );
  }
}

function uniqueEmail(prefix = "pub") {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function registerUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || "Password1!";
  const res = await request(app).post("/recipeapi/users/").send({
    firstName: overrides.firstName || "Lana",
    lastName: overrides.lastName || "Tester",
    email,
    password,
  });
  return { res, email, password };
}

async function createRecipe(token, userId, overrides = {}) {
  return request(app)
    .post("/recipeapi/recipes/")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: overrides.name || "Recipe",
      description: overrides.description || "Food",
      servings: overrides.servings ?? 2,
      time: overrides.time ?? 30,
      isPublished: overrides.isPublished,
      userId,
    });
}

describe("Feature 4 — Recipe Publishing", () => {
  beforeAll(async () => {
    assertTestDatabase();
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

  describe("US-4.1 — See Published Recipes", () => {
    it("Guest views published recipes", async () => {
      const { res: user } = await registerUser();
      expect(user.status).toBe(200);

      const created = await createRecipe(user.body.token, user.body.id, {
        name: "Published Soup",
        isPublished: true,
      });
      expect(created.status).toBe(200);

      const res = await request(app).get("/recipeapi/recipes/");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some((r) => r.name === "Published Soup" && r.isPublished === true)).toBe(
        true
      );
    });

    it("No published recipes", async () => {
      const res = await request(app).get("/recipeapi/recipes/");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("Unpublished recipes stay off the guest list", async () => {
      const { res: user } = await registerUser();
      expect(user.status).toBe(200);

      const created = await createRecipe(user.body.token, user.body.id, {
        name: "Draft Stew",
        isPublished: false,
      });
      expect(created.status).toBe(200);

      const res = await request(app).get("/recipeapi/recipes/");
      expect(res.status).toBe(200);
      expect(res.body.find((r) => r.name === "Draft Stew")).toBeUndefined();
    });
  });

  describe("US-4.2 — Publish Recipe", () => {
    it("Owner publishes a recipe", async () => {
      const { res: user } = await registerUser();
      expect(user.status).toBe(200);

      const created = await createRecipe(user.body.token, user.body.id, {
        name: "Recipe",
        isPublished: false,
      });
      expect(created.status).toBe(200);

      const updated = await request(app)
        .put(`/recipeapi/recipes/${created.body.id}`)
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({ isPublished: true });
      expect(updated.status).toBe(200);

      const guest = await request(app).get("/recipeapi/recipes/");
      expect(guest.status).toBe(200);
      expect(guest.body.some((r) => r.id === created.body.id && r.isPublished === true)).toBe(
        true
      );
    });

    it("Cannot publish without signing in", async () => {
      const post = await request(app).post("/recipeapi/recipes/").send({
        name: "Recipe",
        description: "Food",
        servings: 2,
        time: 30,
        isPublished: true,
        userId: 1,
      });
      expect(post.status).toBe(401);
      expect(post.body).toEqual({ message: "Unauthorized! No Auth Header" });

      const put = await request(app)
        .put("/recipeapi/recipes/1")
        .send({ isPublished: true });
      expect(put.status).toBe(401);
      expect(put.body).toEqual({ message: "Unauthorized! No Auth Header" });
    });

    it("Cannot publish another user’s recipe", async () => {
      const { res: userA } = await registerUser({ firstName: "A" });
      const { res: userB } = await registerUser({ firstName: "B" });
      expect(userA.status).toBe(200);
      expect(userB.status).toBe(200);

      const ownedByB = await createRecipe(userB.body.token, userB.body.id, {
        name: "B's Recipe",
        isPublished: false,
      });
      expect(ownedByB.status).toBe(200);
      const recipeId = ownedByB.body.id;

      const res = await request(app)
        .put(`/recipeapi/recipes/${recipeId}`)
        .set("Authorization", `Bearer ${userA.body.token}`)
        .send({ isPublished: true });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: `Cannot find Recipe with id=${recipeId}.`,
      });
    });

    it("Cannot create a recipe with isPublished omitted", async () => {
      const { res: user } = await registerUser();
      expect(user.status).toBe(200);

      const res = await request(app)
        .post("/recipeapi/recipes/")
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Recipe",
          description: "Food",
          servings: 2,
          time: 30,
          userId: user.body.id,
        });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: "Is Published cannot be empty for recipe!",
      });
    });
  });

  describe("US-4.3 — Unpublish Recipe", () => {
    it("Owner unpublishes a recipe", async () => {
      const { res: user } = await registerUser();
      expect(user.status).toBe(200);

      const created = await createRecipe(user.body.token, user.body.id, {
        name: "Recipe",
        isPublished: true,
      });
      expect(created.status).toBe(200);

      const updated = await request(app)
        .put(`/recipeapi/recipes/${created.body.id}`)
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({ isPublished: false });
      expect(updated.status).toBe(200);
      expect(updated.body).toEqual({
        message: "Recipe was updated successfully.",
      });

      const guest = await request(app).get("/recipeapi/recipes/");
      expect(guest.status).toBe(200);
      expect(guest.body.find((r) => r.id === created.body.id)).toBeUndefined();
    });

    it("Cannot unpublish without signing in", async () => {
      const res = await request(app)
        .put("/recipeapi/recipes/1")
        .send({ isPublished: false });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Unauthorized! No Auth Header" });
    });

    it("Cannot unpublish another user’s recipe", async () => {
      const { res: userA } = await registerUser({ firstName: "A" });
      const { res: userB } = await registerUser({ firstName: "B" });
      expect(userA.status).toBe(200);
      expect(userB.status).toBe(200);

      const ownedByB = await createRecipe(userB.body.token, userB.body.id, {
        name: "Published",
        isPublished: true,
      });
      expect(ownedByB.status).toBe(200);
      const recipeId = ownedByB.body.id;

      const res = await request(app)
        .put(`/recipeapi/recipes/${recipeId}`)
        .set("Authorization", `Bearer ${userA.body.token}`)
        .send({ isPublished: false });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: `Cannot find Recipe with id=${recipeId}.`,
      });
    });
  });
});
