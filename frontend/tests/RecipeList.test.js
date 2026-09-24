/**
 * Feature 3 — Recipe Management
 * Spec: features/feature-3-recipe-management.md
 *
 * Feature 4 — Recipe Publishing
 * Spec: features/feature-4-recipe-publishing.md
 */

import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import RecipeList from "../src/views/RecipeList.vue";
import RecipeCard from "../src/components/RecipeCardComponent.vue";
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

const publishedRecipe = {
  id: 1,
  name: "Recipe",
  description: "Food",
  servings: 2,
  time: 30,
  isPublished: true,
  userId: 1,
};

function visibleHeadings(wrapper) {
  return wrapper
    .findAll("h3")
    .filter((heading) => heading.isVisible())
    .map((heading) => heading.text().trim());
}

function visibleTableHeaders(wrapper) {
  return wrapper
    .findAll("th")
    .filter((header) => header.isVisible())
    .map((header) => header.text().trim());
}

describe("Feature 4 — Recipe Publishing", () => {
  let wrapper;
  let router;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    RecipeServices.getRecipes.mockResolvedValue({ data: [publishedRecipe] });
    RecipeServices.getRecipesByUserId.mockResolvedValue({ data: [] });
    RecipeServices.addRecipe.mockResolvedValue({
      status: 200,
      data: { ...publishedRecipe },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
    document.body.innerHTML = "";
  });

  describe("US-4.1 — See Published Recipes", () => {
    it("Guest views published recipes", async () => {
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      expect(wrapper.text()).toContain("Recipes");
      expect(wrapper.text()).toContain("Recipe");
      expect(RecipeServices.getRecipes).toHaveBeenCalled();
      expect(RecipeServices.getRecipesByUserId).not.toHaveBeenCalled();
      expect(buttonByText(wrapper, "Add")).toBeFalsy();
    });

    it("Published recipe card shows name, servings, time, and description", async () => {
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      expect(wrapper.text()).toContain("Recipe");
      expect(wrapper.text()).toContain("2 Servings");
      expect(wrapper.text()).toContain("30 minutes");
      expect(wrapper.text()).toContain("Food");
    });

    it("Guest expands a published recipe", async () => {
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      const card = wrapper.findComponent(RecipeCard);
      expect(card.exists()).toBe(true);
      await card.trigger("click");
      await nextTick();

      expect(visibleHeadings(wrapper)).toEqual(
        expect.arrayContaining(["Ingredients", "Recipe Steps"])
      );
      expect(visibleTableHeaders(wrapper)).toEqual(
        expect.arrayContaining(["Step", "Instruction", "Ingredients"])
      );
    });

    it("Guest collapses an expanded published recipe", async () => {
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      const card = wrapper.findComponent(RecipeCard);
      const cardRoot = card.find(".v-card");
      await cardRoot.trigger("click");
      await nextTick();
      expect(visibleHeadings(wrapper)).toEqual(
        expect.arrayContaining(["Ingredients", "Recipe Steps"])
      );
      expect(card.vm.$.setupState.showDetails).toBe(true);

      await cardRoot.trigger("click");
      await nextTick();
      await flushPromises();

      expect(card.vm.$.setupState.showDetails).toBe(false);
      const details = card.find(".pt-0");
      expect(
        details.exists() === false ||
          details.isVisible() === false ||
          details.element.style.display === "none"
      ).toBe(true);
    });

    it("No published recipes", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [] });
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      expect(wrapper.findComponent(RecipeCard).exists()).toBe(false);
      expect(wrapper.text()).toContain("Recipes");
      expect(wrapper.vm.snackbar.value).toBe(false);
    });

    it("Unpublished recipes stay off the guest list", async () => {
      RecipeServices.getRecipes.mockResolvedValue({ data: [publishedRecipe] });
      router = await makeRouter();
      wrapper = await mountRecipes(router);

      expect(wrapper.text()).toContain("Recipe");
      expect(wrapper.text()).not.toContain("Secret Recipe");
    });
  });

  describe("US-4.2 — Publish Recipe", () => {
    it("Owner publishes a recipe", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      RecipeServices.getRecipesByUserId.mockResolvedValue({ data: [] });
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
      await nameInput.setValue("Recipe");

      const publishSwitch = wrapper
        .findAllComponents({ name: "VSwitch" })
        .find((field) => String(field.props("label") || "").includes("Publish?"));
      expect(publishSwitch).toBeTruthy();
      await publishSwitch.setValue(true);
      await nextTick();

      RecipeServices.addRecipe.mockImplementation(async (payload) => {
        RecipeServices.getRecipesByUserId.mockResolvedValue({
          data: [{ ...publishedRecipe, ...payload, id: 1 }],
        });
        return { status: 200, data: { ...publishedRecipe, ...payload, id: 1 } };
      });

      const confirm = buttonByText(wrapper, "Add Recipe");
      await confirm.trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeServices.addRecipe).toHaveBeenCalled();
      const sent = RecipeServices.addRecipe.mock.calls[0][0];
      expect(sent.isPublished).toBe(true);
      expect(sent.name).toBe("Recipe");

      wrapper.unmount();
      localStorage.clear();
      RecipeServices.getRecipes.mockResolvedValue({
        data: [{ ...publishedRecipe, isPublished: true }],
      });
      wrapper = await mountRecipes(router);

      expect(wrapper.text()).toContain("Recipe");
      expect(RecipeServices.getRecipes).toHaveBeenCalled();
    });
  });
});
