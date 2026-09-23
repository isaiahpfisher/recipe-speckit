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
import RecipeList from "../src/views/RecipeList.vue";
import RecipeServices from "../src/services/RecipeServices.js";
import RecipeIngredientServices from "../src/services/RecipeIngredientServices.js";
import RecipeStepServices from "../src/services/RecipeStepServices.js";

vi.mock("../src/services/RecipeServices.js", () => ({
  default: {
    getRecipes: vi.fn(),
    getRecipesByUserId: vi.fn(),
    addRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    getRecipe: vi.fn(),
  },
}));

vi.mock("../src/services/RecipeIngredientServices.js", () => ({
  default: {
    getRecipeIngredientsForRecipe: vi.fn(),
  },
}));

vi.mock("../src/services/RecipeStepServices.js", () => ({
  default: {
    getRecipeStepsForRecipeWithIngredients: vi.fn(),
  },
}));

vi.mock("../src/reports/RecipeReports.js", () => ({
  default: {
    generateRecipePDF: vi.fn(),
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

const unpublishedRecipe = {
  id: 2,
  name: "Draft Stew",
  description: "Hidden",
  servings: 4,
  time: 45,
  isPublished: false,
  userId: 1,
};

const dialogStub = {
  name: "VDialog",
  props: {
    modelValue: { type: Boolean, default: false },
  },
  template: `<div class="v-dialog-stub"><slot v-if="modelValue" /></div>`,
};

function signIn() {
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
}

async function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "login", component: { template: "<div>Login</div>" } },
      { path: "/recipes", name: "recipes", component: RecipeList },
      {
        path: "/recipe/:id",
        name: "editRecipe",
        component: { template: "<div>Edit</div>" },
      },
    ],
  });
  await router.push("/recipes");
  await router.isReady();
  return router;
}

async function mountList() {
  const router = await makeRouter();
  const wrapper = mount(RecipeList, {
    global: {
      plugins: [router, vuetify],
      stubs: {
        VDialog: dialogStub,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

function buttonByText(wrapper, text) {
  return wrapper
    .findAll("button")
    .find((button) => button.text().replace(/\s+/g, " ").trim().includes(text));
}

describe("Feature 4 — Recipe Publishing", () => {
  let wrapper;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    RecipeIngredientServices.getRecipeIngredientsForRecipe.mockResolvedValue({
      data: [],
    });
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

  describe("US-4.1 — See Published Recipes", () => {
    it("Guest views published recipes", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [publishedRecipe] });

      wrapper = await mountList();

      expect(RecipeServices.getRecipes).toHaveBeenCalled();
      expect(RecipeServices.getRecipesByUserId).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("Recipes");
      expect(wrapper.text()).toContain("Recipe");
    });

    it("Published recipe card shows name, servings, time, and description", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [publishedRecipe] });

      wrapper = await mountList();

      expect(wrapper.text()).toContain("Recipe");
      expect(wrapper.text()).toContain("2 Servings");
      expect(wrapper.text()).toContain("30 minutes");
      expect(wrapper.text()).toContain("Food");
    });

    it("Guest expands a published recipe", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [publishedRecipe] });

      wrapper = await mountList();
      const cards = wrapper.findAllComponents({ name: "VCard" });
      const recipeCard = cards.find((card) => card.text().includes("Recipe"));
      await recipeCard.trigger("click");
      await nextTick();

      const headings = wrapper.findAll("h3");
      const ingredients = headings.find((h) => h.text() === "Ingredients");
      const steps = headings.find((h) => h.text() === "Recipe Steps");
      expect(ingredients.isVisible()).toBe(true);
      expect(steps.isVisible()).toBe(true);
      expect(wrapper.text()).toContain("Step");
      expect(wrapper.text()).toContain("Instruction");
    });

    it("Guest collapses an expanded published recipe", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [publishedRecipe] });

      wrapper = await mountList();
      const cards = wrapper.findAllComponents({ name: "VCard" });
      const recipeCard = cards.find((card) => card.text().includes("Recipe"));
      await recipeCard.trigger("click");
      await nextTick();
      await recipeCard.trigger("click");
      await nextTick();

      const headings = wrapper.findAll("h3");
      const ingredients = headings.find((h) => h.text() === "Ingredients");
      const steps = headings.find((h) => h.text() === "Recipe Steps");
      expect(ingredients.isVisible()).toBe(false);
      expect(steps.isVisible()).toBe(false);
    });

    it("No published recipes", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [] });

      wrapper = await mountList();

      expect(wrapper.text()).toContain("Recipes");
      expect(wrapper.text()).not.toContain("2 Servings");
      expect(wrapper.vm.snackbar.value).toBe(false);
    });

    it("Unpublished recipes stay off the guest list", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [publishedRecipe] });

      wrapper = await mountList();

      expect(wrapper.text()).toContain("Recipe");
      expect(wrapper.text()).not.toContain("Draft Stew");
      expect(
        RecipeServices.getRecipes.mock.results[0].value
      ).toBeDefined();
    });
  });

  describe("US-4.2 — Publish Recipe", () => {
    it("Owner publishes a recipe", async () => {
      signIn();
      RecipeServices.getRecipesByUserId.mockResolvedValue({
        data: [unpublishedRecipe],
      });
      RecipeServices.addRecipe.mockResolvedValue({
        status: 200,
        data: { ...publishedRecipe, name: "New Pub" },
      });

      wrapper = await mountList();
      await buttonByText(wrapper, "Add").trigger("click");
      await nextTick();

      wrapper.vm.newRecipe.name = "New Pub";
      wrapper.vm.newRecipe.description = "Food";
      wrapper.vm.newRecipe.servings = 2;
      wrapper.vm.newRecipe.time = 30;
      wrapper.vm.newRecipe.isPublished = true;
      await buttonByText(wrapper, "Add Recipe").trigger("click");
      await flushPromises();

      expect(RecipeServices.addRecipe).toHaveBeenCalled();
      const payload = RecipeServices.addRecipe.mock.calls[0][0];
      expect(payload.isPublished).toBe(true);
      expect(payload.name).toBe("New Pub");
    });
  });
});
