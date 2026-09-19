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
  let sugarOnPie;

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
    sugarOnPie = await db.recipeIngredient.create({
      quantity: 1,
      recipeId: pie.id,
      ingredientId: sugar.id,
    });
  });

  describe("US-3.7 — Add Steps to a recipe", () => {
    it("Add Steps to a recipe", async () => {
      const createRes = await request(app)
        .post(`/recipeapi/recipes/${pie.id}/recipeSteps`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          stepNumber: 1,
          instruction: "mix",
          recipeId: pie.id,
        });

      expect(createRes.status).toBe(200);
      expect(createRes.body).toEqual(
        expect.objectContaining({
          stepNumber: 1,
          instruction: "mix",
          recipeId: pie.id,
        })
      );

      await request(app)
        .put(
          `/recipeapi/recipes/${pie.id}/recipeIngredients/${sugarOnPie.id}`
        )
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          quantity: 1,
          recipeId: pie.id,
          ingredientId: sugar.id,
          recipeStepId: createRes.body.id,
        });

      const list = await request(app)
        .get(`/recipeapi/recipes/${pie.id}/recipeStepsWithIngredients`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(list.status).toBe(200);
      const mix = list.body.find((step) => step.instruction === "mix");
      expect(mix).toBeDefined();
      const ingredientNames = (mix.recipeIngredient || []).map(
        (row) => row.ingredient?.name
      );
      expect(ingredientNames).toContain("sugar");
    });
  });

  describe("US-3.8 — Edit and Delete Steps from a recipe", () => {
    it("Edit Step on a recipe", async () => {
      const step = await db.recipeStep.create({
        stepNumber: 1,
        instruction: "mix",
        recipeId: pie.id,
      });

      const res = await request(app)
        .put(`/recipeapi/recipes/${pie.id}/recipeSteps/${step.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          stepNumber: 1,
          instruction: "mix in a bowl",
          recipeId: pie.id,
        });

      expect(res.status).toBe(200);
      const updated = await db.recipeStep.findByPk(step.id);
      expect(updated.instruction).toBe("mix in a bowl");
    });

    it("Delete Step from a recipe", async () => {
      const step = await db.recipeStep.create({
        stepNumber: 1,
        instruction: "mix",
        recipeId: pie.id,
      });

      const res = await request(app)
        .delete(`/recipeapi/recipes/${pie.id}/recipeSteps/${step.id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const gone = await db.recipeStep.findByPk(step.id);
      expect(gone).toBeNull();
    });
  });
});
