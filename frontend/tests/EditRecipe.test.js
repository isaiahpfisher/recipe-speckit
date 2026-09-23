/**
 * Feature 4 — Recipe Publishing
 * Spec: features/feature-4-recipe-publishing.md
 */

import { nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import EditRecipe from "../src/views/EditRecipe.vue";
import RecipeServices from "../src/services/RecipeServices.js";
import IngredientServices from "../src/services/IngredientServices.js";
import RecipeIngredientServices from "../src/services/RecipeIngredientServices.js";
import RecipeStepServices from "../src/services/RecipeStepServices.js";

vi.mock("../src/services/RecipeServices.js", () => ({
  default: {
    getRecipe: vi.fn(),
    updateRecipe: vi.fn(),
  },
}));

vi.mock("../src/services/IngredientServices.js", () => ({
  default: {
    getIngredients: vi.fn(),
  },
}));

vi.mock("../src/services/RecipeIngredientServices.js", () => ({
  default: {
    getRecipeIngredientsForRecipe: vi.fn(),
  },
}));

vi.mock("../src/services/RecipeStepServices.js", () => ({
  default: {
    getRecipeStepsForRecipe: vi.fn(),
    getRecipeStepsForRecipeWithIngredients: vi.fn(),
  },
}));

const vuetify = createVuetify({ components, directives });

const publishedRecipe = {
  id: 1,
  name: "Recipe",
  description: "Food",
  servings: 2,
  time: 30,
  isPublished: true,
  userId: 1,
};

describe("Feature 4 — Recipe Publishing", () => {
  let wrapper;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: 1,
        firstName: "Lana",
        lastName: "Tester",
        email: "lana@example.com",
        token: "test-token",
      })
    );
    RecipeServices.getRecipe.mockResolvedValue({ data: [publishedRecipe] });
    RecipeServices.updateRecipe.mockResolvedValue({
      status: 200,
      data: { message: "Recipe was updated successfully." },
    });
    IngredientServices.getIngredients.mockResolvedValue({ data: [] });
    RecipeIngredientServices.getRecipeIngredientsForRecipe.mockResolvedValue({
      data: [],
    });
    RecipeStepServices.getRecipeStepsForRecipe.mockResolvedValue({ data: [] });
    RecipeStepServices.getRecipeStepsForRecipeWithIngredients.mockResolvedValue({
      data: [],
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
  });

  describe("US-4.3 — Unpublish Recipe", () => {
    it("Owner unpublishes a recipe", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          {
            path: "/recipe/:id",
            name: "editRecipe",
            component: EditRecipe,
            props: true,
          },
        ],
      });
      await router.push("/recipe/1");
      await router.isReady();

      wrapper = mount(EditRecipe, {
        global: {
          plugins: [router, vuetify],
        },
      });
      await flushPromises();

      expect(wrapper.text()).toContain("Publish?");
      wrapper.vm.recipe.isPublished = false;
      await nextTick();

      const update = wrapper
        .findAll("button")
        .find((button) => button.text().includes("Update Recipe"));
      await update.trigger("click");
      await flushPromises();

      expect(RecipeServices.updateRecipe).toHaveBeenCalled();
      const [id, body] = RecipeServices.updateRecipe.mock.calls[0];
      expect(id).toBe(1);
      expect(body.isPublished).toBe(false);
    });
  });
});
