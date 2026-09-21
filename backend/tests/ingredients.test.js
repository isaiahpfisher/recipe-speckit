/**
 * Feature 2 — Ingredient Management
 * Spec: features/feature-2-ingredient-management.md
 */

const request = require("supertest");
const app = require("../server");
const db = require("../app/models");

function assertTestDatabase() {
  const dbName = process.env.DB_NAME || "";
  if (!dbName.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run ingredient API tests against DB_NAME "${dbName}". Use backend/.env.test with a test database.`
    );
  }
}

async function registerUser() {
  const email = `ingredient-tester-${Date.now()}@example.com`;
  const response = await request(app).post("/recipeapi/users/").send({
    firstName: "Lana",
    lastName: "Tester",
    email,
    password: "Password1!",
  });
  return response;
}

describe("Feature 2 — Ingredient Management", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await db.sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await db.recipeIngredient.destroy({ where: {} });
    await db.ingredient.destroy({ where: {} });
    await db.session.destroy({ where: {} });
    await db.user.destroy({ where: {} });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-2.1 — Create ingredients", () => {
    it("User creates a new ingredient", async () => {
      const user = await registerUser();
      expect(user.status).toBe(200);
      expect(user.body.token).toBeTruthy();

      const response = await request(app)
        .post("/recipeapi/ingredients/")
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Peanut Butter",
          unit: "ounce",
          pricePerUnit: 0.07,
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toEqual(expect.any(Number));
      expect(response.body.name).toBe("Peanut Butter");
      expect(response.body.unit).toBe("ounce");
      expect(response.body.pricePerUnit).toBeDefined();
    });
  });

  describe("US-2.5 — Edit ingredients", () => {
    it("User renames an ingredient", async () => {
      const user = await registerUser();
      expect(user.status).toBe(200);

      const created = await request(app)
        .post("/recipeapi/ingredients/")
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Peanut Butter",
          unit: "ounce",
          pricePerUnit: 0.07,
        });
      expect(created.status).toBe(200);

      const response = await request(app)
        .put(`/recipeapi/ingredients/${created.body.id}`)
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Jelly",
          unit: "ounce",
          pricePerUnit: 0.07,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Ingredient was updated successfully.",
      });
    });

    it("User changes ingredient unit", async () => {
      const user = await registerUser();
      expect(user.status).toBe(200);

      const created = await request(app)
        .post("/recipeapi/ingredients/")
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Peanut Butter",
          unit: "gallon",
          pricePerUnit: 0.07,
        });
      expect(created.status).toBe(200);

      const response = await request(app)
        .put(`/recipeapi/ingredients/${created.body.id}`)
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Peanut Butter",
          unit: "ounce",
          pricePerUnit: 0.07,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Ingredient was updated successfully.",
      });

      const listed = await request(app).get("/recipeapi/ingredients/");
      expect(listed.status).toBe(200);
      expect(listed.body[0].unit).toBe("ounce");
    });

    it("User changes ingredient price", async () => {
      const user = await registerUser();
      expect(user.status).toBe(200);

      const created = await request(app)
        .post("/recipeapi/ingredients/")
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Peanut Butter",
          unit: "ounce",
          pricePerUnit: 4.0,
        });
      expect(created.status).toBe(200);

      const response = await request(app)
        .put(`/recipeapi/ingredients/${created.body.id}`)
        .set("Authorization", `Bearer ${user.body.token}`)
        .send({
          name: "Peanut Butter",
          unit: "ounce",
          pricePerUnit: 0.23,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Ingredient was updated successfully.",
      });

      const listed = await request(app).get("/recipeapi/ingredients/");
      expect(listed.status).toBe(200);
      expect(String(listed.body[0].pricePerUnit)).toBe("0.23");
    });
  });

  describe("US-2.6 — Private access to create and edit ingredients only", () => {
    it("Unauthenticated API request to update ingredient", async () => {
      const response = await request(app)
        .put("/recipeapi/ingredients/1")
        .send({
          name: "Jelly",
          unit: "ounce",
          pricePerUnit: 0.07,
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/unauthorized/i);
    });
  });
});
