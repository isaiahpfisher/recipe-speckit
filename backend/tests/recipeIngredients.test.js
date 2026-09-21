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

describe("Feature 3 — Recipe Management", () => {
  let userA;
  let tokenA;
  let pie;
  let sugar;

  beforeAll(async () => {
    await ensureTestDatabase();
    await db.sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await db.recipeIngredient.destroy({ where: {} });
    await db.recipeStep.destroy({ where: {} });
    await db.recipe.destroy({ where: {} });
    await db.ingredient.destroy({ where: {} });
    await db.session.destroy({ where: {} });
    await db.user.destroy({ where: {} });

    ({ user: userA, token: tokenA } = await createUserWithToken({
      firstName: "Ada",
      lastName: "Owner",
      email: "ada@example.com",
      password: "password123",
    }));

    pie = await db.recipe.create({
      name: "Pie",
      description: "",
      servings: 8,
      time: 45,
      isPublished: false,
      userId: userA.id,
    });
    sugar = await db.ingredient.create({
      name: "sugar",
      unit: "cup",
      pricePerUnit: 1.25,
    });
  });

  describe("US-3.5 — Add Ingredients to a recipe", () => {
    it("Add Ingredients to a recipe", async () => {
      const res = await request(app)
        .post(`/recipeapi/recipes/${pie.id}/recipeIngredients`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          quantity: 1,
          recipeId: pie.id,
          ingredientId: sugar.id,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          quantity: 1,
          recipeId: pie.id,
          ingredientId: sugar.id,
        })
      );

      const list = await request(app)
        .get(`/recipeapi/recipes/${pie.id}/recipeIngredients`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(list.status).toBe(200);
      expect(
        list.body.some(
          (row) => row.ingredientId === sugar.id || row.ingredient?.name === "sugar"
        )
      ).toBe(true);
    });
  });

  describe("US-3.6 — Edit and Delete Ingredients from a recipe", () => {
    it("Edit Ingredients to a recipe", async () => {
      const recipeIngredient = await db.recipeIngredient.create({
        quantity: 1,
        recipeId: pie.id,
        ingredientId: sugar.id,
      });

      const res = await request(app)
        .put(
          `/recipeapi/recipes/${pie.id}/recipeIngredients/${recipeIngredient.id}`
        )
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          quantity: 1,
          recipeId: pie.id,
          ingredientId: sugar.id,
        });

      expect(res.status).toBe(200);
      const updated = await db.recipeIngredient.findByPk(recipeIngredient.id);
      expect(Number(updated.quantity)).toBe(1);
    });

    it("Delete Ingredients to a recipe", async () => {
      const recipeIngredient = await db.recipeIngredient.create({
        quantity: 1,
        recipeId: pie.id,
        ingredientId: sugar.id,
      });

      const res = await request(app)
        .delete(
          `/recipeapi/recipes/${pie.id}/recipeIngredients/${recipeIngredient.id}`
        )
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const gone = await db.recipeIngredient.findByPk(recipeIngredient.id);
      expect(gone).toBeNull();
    });
  });
});
