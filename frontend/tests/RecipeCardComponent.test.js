/**
 * Feature 5 — Recipe PDF Export
 * Spec: features/feature-5-pdf-reports.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createVuetify } from "vuetify";

const mocks = vi.hoisted(() => ({ generateRecipePDF: vi.fn() }));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../src/reports/RecipeReports.js", () => ({
  default: { generateRecipePDF: mocks.generateRecipePDF },
}));
vi.mock("../src/services/RecipeIngredientServices.js", () => ({
  default: {
    getRecipeIngredientsForRecipe: vi.fn().mockResolvedValue({ data: [] }),
  },
}));
vi.mock("../src/services/RecipeStepServices.js", () => ({
  default: {
    getRecipeStepsForRecipeWithIngredients: vi
      .fn()
      .mockResolvedValue({ data: [] }),
  },
}));

import RecipeCard from "../src/components/RecipeCardComponent.vue";

const recipe = {
  id: 7,
  name: "Pancakes",
  description: "Fluffy pancakes",
  servings: 4,
  time: 20,
  isPublished: true,
};

async function mountCard() {
  const wrapper = mount(RecipeCard, {
    props: { recipe },
    global: { plugins: [createVuetify()] },
  });
  await flushPromises();
  return wrapper;
}

describe("Feature 5 — Recipe PDF Export", () => {
  describe("US-5.1 — Export Recipe to PDF", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it("User exports recipe to PDF", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ id: 42, email: "cook@example.com", token: "abc" })
      );
      const wrapper = await mountCard();

      const pdfIcon = wrapper.find(".mdi-file-pdf-box");
      expect(pdfIcon.exists()).toBe(true);

      await pdfIcon.trigger("click");

      expect(mocks.generateRecipePDF).toHaveBeenCalledTimes(1);
      expect(mocks.generateRecipePDF).toHaveBeenCalledWith(
        expect.objectContaining({ id: 7, name: "Pancakes" })
      );
    });

    it("Guest user cannot export recipe to PDF", async () => {
      const wrapper = await mountCard();

      expect(wrapper.text()).toContain("Pancakes");
      expect(wrapper.find(".mdi-file-pdf-box").exists()).toBe(false);
      expect(mocks.generateRecipePDF).not.toHaveBeenCalled();
    });
  });
});
