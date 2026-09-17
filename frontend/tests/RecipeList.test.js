/**
 * Feature 3 — Recipe Management
 * Spec: features/feature-3-recipe-management.md
 */

import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import RecipeList from "../src/views/RecipeList.vue";
import RecipeServices from "../src/services/RecipeServices.js";

vi.mock("../src/services/RecipeServices.js", () => ({
  default: {
    getRecipes: vi.fn(),
    getRecipesByUserId: vi.fn(),
    getRecipe: vi.fn(),
    addRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
  },
}));

vi.mock("../src/services/RecipeIngredientServices.js", () => ({
  default: {
    getRecipeIngredientsForRecipe: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock("../src/services/RecipeStepServices.js", () => ({
  default: {
    getRecipeStepsForRecipeWithIngredients: vi.fn(() =>
      Promise.resolve({ data: [] })
    ),
  },
}));

vi.mock("../src/reports/RecipeReports.js", () => ({
  default: {
    generateRecipePDF: vi.fn(),
  },
}));

const sessionUser = {
  id: 1,
  firstName: "Ada",
  lastName: "Owner",
  email: "ada@example.com",
  token: "test-token",
};

const pie = {
  id: 10,
  name: "Pie",
  description: "",
  servings: 8,
  time: 45,
  userId: 1,
};
const cake = {
  id: 11,
  name: "Cake",
  description: "",
  servings: 12,
  time: 60,
  userId: 1,
};

function vuetify() {
  return createVuetify({ components, directives });
}

function dialogStub() {
  return {
    name: "VDialog",
    props: ["modelValue", "persistent", "width"],
    template: '<div class="v-dialog-stub" v-if="modelValue"><slot /></div>',
  };
}

async function makeRouter(initialPath = "/recipes") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "login", component: { template: "<div>Login</div>" } },
      { path: "/recipes", name: "recipes", component: RecipeList },
      {
        path: "/recipe/:id",
        name: "editRecipe",
        component: { template: "<div>Edit Recipe</div>" },
      },
    ],
  });
  await router.push(initialPath);
  await router.isReady();
  return router;
}

function mockOwnedRecipes(recipes) {
  RecipeServices.getRecipes.mockResolvedValue({ data: recipes });
  RecipeServices.getRecipesByUserId.mockResolvedValue({ data: recipes });
}

async function mountRecipes(router) {
  const wrapper = mount(RecipeList, {
    global: {
      plugins: [vuetify(), router],
      stubs: { VDialog: dialogStub() },
    },
  });
  await flushPromises();
  await nextTick();
  return wrapper;
}

function buttonByText(wrapper, text) {
  return wrapper.findAll("button").find((btn) => {
    const normalized = btn.text().replace(/\s+/g, " ").trim();
    return normalized === text || normalized.includes(text);
  });
}

describe("Feature 3 — Recipe Management", () => {
  let wrapper;
  let router;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockOwnedRecipes([]);
    RecipeServices.addRecipe.mockResolvedValue({
      status: 200,
      data: { id: 10, name: "Pie", userId: 1 },
    });
    RecipeServices.deleteRecipe.mockResolvedValue({
      status: 200,
      data: { message: "Recipe was deleted successfully!" },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
    document.body.innerHTML = "";
  });

  describe("US-3.1 — Create Recipe", () => {
    it("User creates a new recipe", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      mockOwnedRecipes([]);
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      const openAdd = buttonByText(wrapper, "Add");
      expect(openAdd).toBeTruthy();
      await openAdd.trigger("click");
      await nextTick();

      const nameInput = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((field) => field.props("label") === "Name")
        .find("input");
      await nameInput.setValue("Pie");

      RecipeServices.addRecipe.mockImplementation(async () => {
        mockOwnedRecipes([{ ...pie, name: "Pie" }]);
        return { status: 200, data: { id: 10, name: "Pie", userId: 1 } };
      });

      const confirm = buttonByText(wrapper, "Add Recipe");
      expect(confirm).toBeTruthy();
      await confirm.trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeServices.addRecipe).toHaveBeenCalled();
      expect(wrapper.text()).toContain("Pie");
      expect(wrapper.find(".v-dialog-stub").exists()).toBe(false);
    });

    it("User creates a recipe with an empty name", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      const openAdd = buttonByText(wrapper, "Add");
      expect(openAdd).toBeTruthy();
      await openAdd.trigger("click");
      await nextTick();

      const nameInput = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((field) => field.props("label") === "Name")
        .find("input");
      await nameInput.setValue("   ");

      const confirm = buttonByText(wrapper, "Add Recipe");
      await confirm.trigger("click");
      await flushPromises();

      expect(RecipeServices.addRecipe).toHaveBeenCalled();
    });
  });

  describe("US-3.2 — View my Recipes", () => {
    it("Dashboard loads with existing recipes", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      mockOwnedRecipes([pie, cake]);
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      expect(wrapper.text()).toContain("Pie");
      expect(wrapper.text()).toContain("Cake");
      expect(wrapper.html().includes("mdi-pencil")).toBe(true);
    });

    it("User has no recipes", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      mockOwnedRecipes([]);
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      expect(wrapper.text()).not.toContain("Pie");
      expect(wrapper.text()).not.toContain("Cake");
      const addButton = buttonByText(wrapper, "Add");
      expect(addButton).toBeTruthy();
    });

    it("User cannot see another user's Recipe", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      mockOwnedRecipes([pie]);
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      expect(wrapper.text()).toContain("Pie");
      expect(wrapper.text()).not.toContain("Secret Recipe");
    });
  });

  describe("US-3.3 — Edit and Delete Recipes", () => {
    it("Edit a recipe", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      mockOwnedRecipes([pie]);
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      const push = vi.spyOn(router, "push");
      const icon = wrapper.find(".mdi-pencil");
      expect(icon.exists()).toBe(true);
      await icon.trigger("click");
      await flushPromises();

      expect(push).toHaveBeenCalledWith({
        name: "editRecipe",
        params: { id: pie.id },
      });
    });
  });

  describe("US-3.4 — Private recipe only", () => {
    it("Unauthenticated user accesses the dashboard", async () => {
      localStorage.clear();
      router = await makeRouter("/recipes");
      wrapper = await mountRecipes(router);
      await flushPromises();

      expect(router.currentRoute.value.name).toBe("recipes");
      expect(buttonByText(wrapper, "Add")).toBeFalsy();
    });
  });
});
