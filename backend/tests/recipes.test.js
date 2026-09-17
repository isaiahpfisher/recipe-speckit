/**
 * Feature 3 — Recipe Management
 * Spec: features/feature-3-recipe-management.md
 */

const request = require("supertest");
const mysql = require("mysql2/promise");
const app = require("../server");
const db = require("../app/models");
const {
  encrypt,
  getSalt,
  hashPassword,
} = require("../app/authentication/crypto");

async function ensureTestDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PW || undefined,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
  );
  await connection.end();
}

async function createUserWithToken({ firstName, lastName, email, password }) {
  const salt = await getSalt();
  const hash = await hashPassword(password, salt);
  const user = await db.user.create({
    firstName,
    lastName,
    email,
    password: hash,
    salt,
  });
  const session = await db.session.create({
    email,
    userId: user.id,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  const token = await encrypt(session.id);
  return { user, token };
}

function recipeBody(userId, name, extra = {}) {
  return {
    name,
    description: extra.description ?? "",
    servings: extra.servings ?? 2,
    time: extra.time ?? 30,
    isPublished: extra.isPublished ?? false,
    userId,
  };
}

async function createRecipe(userId, name, extra = {}) {
  return db.recipe.create(recipeBody(userId, name, extra));
}

describe("Feature 3 — Recipe Management", () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeAll(async () => {
    await ensureTestDatabase();
    await db.sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await db.recipeIngredient.destroy({ where: {} });
    await db.recipeStep.destroy({ where: {} });
    await db.recipe.destroy({ where: {} });
    await db.session.destroy({ where: {} });
    await db.user.destroy({ where: {} });

    ({ user: userA, token: tokenA } = await createUserWithToken({
      firstName: "Ada",
      lastName: "Owner",
      email: "ada@example.com",
      password: "password123",
    }));
    ({ user: userB, token: tokenB } = await createUserWithToken({
      firstName: "Bea",
      lastName: "Other",
      email: "bea@example.com",
      password: "password123",
    }));
  });

  describe("US-3.1 — Create Recipe", () => {
    it("User creates a new recipe", async () => {
      const res = await request(app)
        .post("/recipeapi/recipes")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(recipeBody(userA.id, "Pie"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          name: "Pie",
          userId: userA.id,
        })
      );
      expect(res.body.id).toBeDefined();

      const list = await request(app)
        .get(`/recipeapi/recipes/user/${userA.id}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(list.status).toBe(200);
      expect(list.body.map((recipe) => recipe.name)).toContain("Pie");
    });
  });

  describe("US-3.2 — View my Recipes", () => {
    it("User cannot see another user's Recipe", async () => {
      await createRecipe(userA.id, "Pie");
      await createRecipe(userB.id, "Secret Recipe");

      const res = await request(app)
        .get(`/recipeapi/recipes/user/${userA.id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const names = res.body.map((recipe) => recipe.name);
      expect(names).toContain("Pie");
      expect(names).not.toContain("Secret Recipe");
      expect(res.body.every((recipe) => recipe.userId === userA.id)).toBe(true);
    });
  });

  describe("US-3.3 — Edit and Delete Recipes", () => {
    it("Delete a recipe", async () => {
      const pie = await createRecipe(userA.id, "Pie");

      const res = await request(app)
        .delete(`/recipeapi/recipes/${pie.id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Recipe was deleted successfully!",
      });
      expect(await db.recipe.findByPk(pie.id)).toBeNull();
    });
  });

  describe("US-3.4 — Private recipe only", () => {
    it("User attempts to rename another user's recipe", async () => {
      const otherRecipe = await createRecipe(userB.id, "Bea's Pie");

      const res = await request(app)
        .put(`/recipeapi/recipes/${otherRecipe.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Hijacked" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: `Cannot find Recipe with id=${otherRecipe.id}.`,
      });

      const unchanged = await db.recipe.findByPk(otherRecipe.id);
      expect(unchanged.name).toBe("Bea's Pie");
    });

    it("User attempts to delete another user's recipe", async () => {
      const otherRecipe = await createRecipe(userB.id, "Bea's Pie");

      const res = await request(app)
        .delete(`/recipeapi/recipes/${otherRecipe.id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Recipe was deleted successfully!",
      });
      expect(await db.recipe.findByPk(otherRecipe.id)).toBeNull();
    });

    it("Create stores userId from the request body", async () => {
      const res = await request(app)
        .post("/recipeapi/recipes")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(recipeBody(userB.id, "Bad"));

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(userB.id);

      const saved = await db.recipe.findByPk(res.body.id);
      expect(saved.userId).toBe(userB.id);
    });

    it("Unauthenticated API request to recipes", async () => {
      await createRecipe(userA.id, "Public Pie", { isPublished: true });
      await createRecipe(userB.id, "Secret Recipe", { isPublished: false });

      const res = await request(app).get("/recipeapi/recipes");

      expect(res.status).toBe(200);
      const names = res.body.map((recipe) => recipe.name);
      expect(names).toContain("Public Pie");
      expect(names).not.toContain("Secret Recipe");
    });
  });
});
