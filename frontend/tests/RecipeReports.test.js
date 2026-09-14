/**
 * Feature 5 — Recipe PDF Export
 * Spec: features/feature-5-pdf-reports.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const doc = {
    internal: { pageSize: { height: 11 } },
    addImage: vi.fn(),
    text: vi.fn(),
    autoTable: vi.fn(),
    save: vi.fn(),
  };
  doc.setFontSize = vi.fn(() => doc);
  return {
    doc,
    jsPDF: vi.fn(function () {
      return doc;
    }),
    getRecipeIngredientsForRecipe: vi.fn(),
    getRecipeStepsForRecipeWithIngredients: vi.fn(),
  };
});

vi.mock("jspdf", () => ({ default: mocks.jsPDF }));
vi.mock("jspdf-autotable", () => ({}));
vi.mock("../src/services/RecipeIngredientServices.js", () => ({
  default: {
    getRecipeIngredientsForRecipe: mocks.getRecipeIngredientsForRecipe,
  },
}));
vi.mock("../src/services/RecipeStepServices.js", () => ({
  default: {
    getRecipeStepsForRecipeWithIngredients:
      mocks.getRecipeStepsForRecipeWithIngredients,
  },
}));

import RecipeReports from "../src/reports/RecipeReports.js";

const flour = { id: 1, name: "Flour", unit: "cup", pricePerUnit: 0.5 };
const egg = { id: 2, name: "Egg", unit: "egg", pricePerUnit: 0.25 };

const recipe = { id: 7, name: "Pancakes", description: "Fluffy pancakes" };

describe("Feature 5 — Recipe PDF Export", () => {
  describe("US-5.1 — Export Recipe to PDF", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 8, 12, 12, 0, 0));

      mocks.getRecipeIngredientsForRecipe.mockResolvedValue({
        data: [
          { id: 11, quantity: 2, ingredient: flour },
          { id: 12, quantity: 1, ingredient: egg },
        ],
      });
      mocks.getRecipeStepsForRecipeWithIngredients.mockResolvedValue({
        data: [
          {
            id: 21,
            stepNumber: 1,
            instruction: "Whisk flour and egg",
            recipeIngredient: [{ ingredient: flour }, { ingredient: egg }],
          },
          {
            id: 22,
            stepNumber: 2,
            instruction: "Cook on a hot griddle",
            recipeIngredient: [],
          },
        ],
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("User exports recipe to PDF", async () => {
      const { doc } = mocks;

      await RecipeReports.generateRecipePDF(recipe);

      expect(mocks.getRecipeIngredientsForRecipe).toHaveBeenCalledWith(7);
      expect(mocks.getRecipeStepsForRecipeWithIngredients).toHaveBeenCalledWith(7);
      expect(mocks.jsPDF).toHaveBeenCalledWith({
        orientation: "portrait",
        unit: "in",
        format: "letter",
      });

      // FR-003 — OC logo in the top left corner
      expect(doc.addImage).toHaveBeenCalledTimes(1);
      const [img, format, x, y] = doc.addImage.mock.calls[0];
      expect(img.src).toMatch(/\/oc-logo-white\.png$/);
      expect(format).toBe("PNG");
      expect(x).toBeLessThan(1);
      expect(y).toBeLessThan(1.5);

      const texts = doc.text.mock.calls.map(([value]) => value);

      // FR-004 — recipe name
      expect(texts).toContain("Pancakes");

      // FR-005 — ingredients with quantity, unit, and price per unit
      expect(texts).toContain("Ingredients");
      expect(texts).toContain("2 cups of Flour ($0.5/cup)");
      expect(texts).toContain("1 egg of Egg ($0.25/egg)");

      // FR-006 — steps table: step number, instructions, step ingredients
      expect(texts).toContain("Steps");
      expect(doc.autoTable).toHaveBeenCalledTimes(1);
      const { columns, body } = doc.autoTable.mock.calls[0][0];
      expect(columns).toEqual([
        { title: "Step", dataKey: "stepNumber" },
        { title: "Instruction", dataKey: "instruction" },
        { title: "Ingredients", dataKey: "ingredientList" },
      ]);
      expect(
        body.map(({ stepNumber, instruction, ingredientList }) => ({
          stepNumber,
          instruction,
          ingredientList,
        }))
      ).toEqual([
        {
          stepNumber: 1,
          instruction: "Whisk flour and egg",
          ingredientList: "Flour, Egg",
        },
        {
          stepNumber: 2,
          instruction: "Cook on a hot griddle",
          ingredientList: "",
        },
      ]);

      // FR-007 — bottom-left footer: name + "published as of" + generation date
      const generated = new Date(2026, 8, 12).toLocaleDateString();
      expect(doc.text).toHaveBeenCalledWith(
        `Pancakes published as of ${generated}`,
        0.5,
        doc.internal.pageSize.height - 0.5
      );

      // Downloaded as a PDF
      expect(doc.save).toHaveBeenCalledWith("recipeReport.pdf");
    });
  });
});
