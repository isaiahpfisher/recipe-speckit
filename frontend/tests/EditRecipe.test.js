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
    addRecipeIngredient: vi.fn(),
    updateRecipeIngredient: vi.fn(),
    deleteRecipeIngredient: vi.fn(),
  },
}));

vi.mock("../src/services/RecipeStepServices.js", () => ({
  default: {
    getRecipeStepsForRecipeWithIngredients: vi.fn(),
    addRecipeStep: vi.fn(),
    updateRecipeStep: vi.fn(),
    deleteRecipeStep: vi.fn(),
  },
}));

const pieRecipe = {
  id: 10,
  name: "Pie",
  description: "",
  servings: 8,
  time: 45,
  isPublished: false,
  userId: 1,
};

const sugarIngredient = {
  id: 5,
  name: "sugar",
  unit: "cup",
  pricePerUnit: 1.25,
};

const sugarOnRecipe = {
  id: 20,
  quantity: 1,
  recipeId: 10,
  recipeStepId: null,
  ingredientId: 5,
  ingredient: sugarIngredient,
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

async function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "login", component: { template: "<div>Login</div>" } },
      { path: "/recipes", name: "recipes", component: { template: "<div>Recipes</div>" } },
      {
        path: "/recipe/:id",
        name: "editRecipe",
        props: true,
        component: EditRecipe,
      },
    ],
  });
  await router.push("/recipe/10");
  await router.isReady();
  return router;
}

function buttonByText(wrapper, text) {
  return wrapper.findAll("button").find((btn) => {
    const normalized = btn.text().replace(/\s+/g, " ").trim();
    return normalized === text || normalized.includes(text);
  });
}

function inputByLabel(wrapper, label) {
  const field = wrapper
    .findAllComponents({ name: "VTextField" })
    .find((c) => c.props("label") === label);
  return field.find("input");
}

describe("Feature 3 — Recipe Management", () => {
  let wrapper;
  let recipeIngredients;
  let recipeSteps;

  beforeEach(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: 1,
        firstName: "Ada",
        lastName: "Owner",
        email: "ada@example.com",
        token: "test-token",
      })
    );
    vi.clearAllMocks();
    recipeIngredients = [];
    recipeSteps = [];

    RecipeServices.getRecipe.mockResolvedValue({ data: [{ ...pieRecipe }] });
    RecipeServices.updateRecipe.mockResolvedValue({
      data: { message: "Recipe was updated successfully." },
    });
    IngredientServices.getIngredients.mockResolvedValue({
      data: [sugarIngredient],
    });
    RecipeIngredientServices.getRecipeIngredientsForRecipe.mockImplementation(
      () => Promise.resolve({ data: recipeIngredients })
    );
    RecipeIngredientServices.addRecipeIngredient.mockImplementation(
      async (payload) => {
        const row = {
          id: 20,
          quantity: payload.quantity,
          recipeId: payload.recipeId,
          recipeStepId: payload.recipeStepId ?? null,
          ingredientId: payload.ingredientId,
          ingredient: sugarIngredient,
        };
        recipeIngredients = [...recipeIngredients, row];
        return { data: row };
      }
    );
    RecipeIngredientServices.updateRecipeIngredient.mockImplementation(
      async (payload) => {
        recipeIngredients = recipeIngredients.map((row) =>
          row.id === payload.id ? { ...row, ...payload, ingredient: sugarIngredient } : row
        );
        return { data: { message: "RecipeIngredient was updated successfully." } };
      }
    );
    RecipeIngredientServices.deleteRecipeIngredient.mockImplementation(
      async (payload) => {
        recipeIngredients = recipeIngredients.filter((row) => row.id !== payload.id);
        return { data: { message: "RecipeIngredient was deleted successfully!" } };
      }
    );
    RecipeStepServices.getRecipeStepsForRecipeWithIngredients.mockImplementation(
      () => Promise.resolve({ data: recipeSteps })
    );
    RecipeStepServices.addRecipeStep.mockImplementation(async (payload) => {
      const step = {
        id: 30,
        stepNumber: payload.stepNumber,
        instruction: payload.instruction,
        recipeId: payload.recipeId,
        recipeIngredient: [],
      };
      recipeSteps = [...recipeSteps, step];
      return { data: step };
    });
    RecipeStepServices.updateRecipeStep.mockImplementation(async (payload) => {
      recipeSteps = recipeSteps.map((step) =>
        step.id === payload.id ? { ...step, ...payload } : step
      );
      return { data: { message: "RecipeStep was updated successfully." } };
    });
    RecipeStepServices.deleteRecipeStep.mockImplementation(async (payload) => {
      recipeSteps = recipeSteps.filter((step) => step.id !== payload.id);
      return { data: { message: "RecipeStep was deleted successfully!" } };
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
    document.body.innerHTML = "";
    localStorage.clear();
  });

  async function mountEditor() {
    const router = await makeRouter();
    wrapper = mount(EditRecipe, {
      global: {
        plugins: [vuetify(), router],
        stubs: { VDialog: dialogStub() },
      },
    });
    await flushPromises();
    await nextTick();
    return wrapper;
  }

  describe("US-3.3 — Edit and Delete Recipes", () => {
    it("Edit a recipe", async () => {
      await mountEditor();
      expect(wrapper.text()).toContain("Edit Recipe");

      const nameInput = inputByLabel(wrapper, "Name");
      await nameInput.setValue("New Pie");

      RecipeServices.getRecipe.mockResolvedValue({
        data: [{ ...pieRecipe, name: "New Pie" }],
      });

      const save = buttonByText(wrapper, "Update Recipe");
      expect(save).toBeTruthy();
      await save.trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeServices.updateRecipe).toHaveBeenCalled();
      const [, payload] = RecipeServices.updateRecipe.mock.calls[0];
      expect(payload.name).toBe("New Pie");
      expect(wrapper.find("input").element.value).toBe("New Pie");
    });
  });

  describe("US-3.5 — Add Ingredients to a recipe", () => {
    it("Add Ingredients to a recipe", async () => {
      await mountEditor();

      const addButtons = wrapper
        .findAll("button")
        .filter((btn) => btn.text().trim() === "Add");
      expect(addButtons.length).toBeGreaterThan(0);
      await addButtons[0].trigger("click");
      await nextTick();

      expect(wrapper.text()).toContain("Add Ingredient");
      await inputByLabel(wrapper, "Quantity").setValue("1");

      const select = wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Ingredients");
      await select.setValue(sugarIngredient);
      await nextTick();

      const confirm = buttonByText(wrapper, "Add Ingredient");
      await confirm.trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeIngredientServices.addRecipeIngredient).toHaveBeenCalled();
      const sent = RecipeIngredientServices.addRecipeIngredient.mock.calls[0][0];
      expect(Number(sent.quantity)).toBe(1);
      expect(sent.ingredientId).toBe(sugarIngredient.id);
      expect(wrapper.text()).toContain("sugar");
    });
  });

  describe("US-3.6 — Edit and Delete Ingredients from a recipe", () => {
    it("Edit Ingredients to a recipe", async () => {
      recipeIngredients = [{ ...sugarOnRecipe }];
      await mountEditor();
      expect(wrapper.text()).toContain("sugar");

      const edit =
        wrapper.find('[aria-label="Edit ingredient"]');
      if (edit.exists()) {
        await edit.trigger("click");
      } else {
        const icons = wrapper.findAll(".mdi-pencil");
        expect(icons.length).toBeGreaterThan(0);
        await icons[0].trigger("click");
      }
      await nextTick();

      expect(wrapper.text()).toContain("Edit Ingredient");
      await inputByLabel(wrapper, "Quantity").setValue("1");
      const select = wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Ingredients");
      await select.setValue(sugarIngredient);

      await buttonByText(wrapper, "Update Ingredient").trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeIngredientServices.updateRecipeIngredient).toHaveBeenCalled();
      const sent = RecipeIngredientServices.updateRecipeIngredient.mock.calls[0][0];
      expect(Number(sent.quantity)).toBe(1);
    });

    it("Delete Ingredients to a recipe", async () => {
      recipeIngredients = [{ ...sugarOnRecipe }];
      await mountEditor();
      expect(wrapper.text()).toContain("sugar");

      const del = wrapper.find('[aria-label="Delete ingredient"]');
      if (del.exists()) {
        await del.trigger("click");
      } else {
        const icons = wrapper.findAll(".mdi-trash-can");
        expect(icons.length).toBeGreaterThan(0);
        await icons[0].trigger("click");
      }
      await flushPromises();
      await nextTick();

      expect(RecipeIngredientServices.deleteRecipeIngredient).toHaveBeenCalled();
      expect(wrapper.text()).not.toContain("sugar");
    });
  });

  describe("US-3.7 — Add Steps to a recipe", () => {
    it("Add Steps to a recipe", async () => {
      recipeIngredients = [{ ...sugarOnRecipe }];
      await mountEditor();

      const addButtons = wrapper
        .findAll("button")
        .filter((btn) => btn.text().trim() === "Add");
      expect(addButtons.length).toBeGreaterThan(1);
      await addButtons[1].trigger("click");
      await nextTick();

      expect(wrapper.text()).toContain("Add Step");
      await inputByLabel(wrapper, "Number").setValue("1");

      const instruction = wrapper
        .findAllComponents({ name: "VTextarea" })
        .find((c) => c.props("label") === "Instruction")
        .find("textarea");
      await instruction.setValue("mix");

      const select = wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Ingredients");
      await select.setValue([sugarOnRecipe]);
      await nextTick();

      await buttonByText(wrapper, "Add Step").trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeStepServices.addRecipeStep).toHaveBeenCalled();
      const sent = RecipeStepServices.addRecipeStep.mock.calls[0][0];
      expect(sent.instruction).toBe("mix");
      expect(wrapper.text()).toContain("mix");
    });
  });

  describe("US-3.8 — Edit and Delete Steps from a recipe", () => {
    it("Edit Step on a recipe", async () => {
      recipeIngredients = [{ ...sugarOnRecipe }];
      recipeSteps = [
        {
          id: 30,
          stepNumber: 1,
          instruction: "mix",
          recipeId: 10,
          recipeIngredient: [{ ...sugarOnRecipe }],
        },
      ];
      await mountEditor();
      expect(wrapper.text()).toContain("mix");

      const editIcons = wrapper.findAll(".mdi-pencil");
      expect(editIcons.length).toBeGreaterThan(1);
      await editIcons[1].trigger("click");
      await nextTick();

      expect(wrapper.text()).toContain("Edit Step");
      const instruction = wrapper
        .findAllComponents({ name: "VTextarea" })
        .find((c) => c.props("label") === "Instruction")
        .find("textarea");
      await instruction.setValue("mix in a bowl");

      await buttonByText(wrapper, "Update Step").trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeStepServices.updateRecipeStep).toHaveBeenCalled();
      const sent = RecipeStepServices.updateRecipeStep.mock.calls[0][0];
      expect(sent.instruction).toBe("mix in a bowl");
      expect(wrapper.text()).toContain("mix in a bowl");
    });

    it("Delete Step from a recipe", async () => {
      recipeIngredients = [{ ...sugarOnRecipe }];
      recipeSteps = [
        {
          id: 30,
          stepNumber: 1,
          instruction: "mix",
          recipeId: 10,
          recipeIngredient: [{ ...sugarOnRecipe }],
        },
      ];
      await mountEditor();
      expect(wrapper.text()).toContain("mix");

      const trashIcons = wrapper.findAll(".mdi-trash-can");
      expect(trashIcons.length).toBeGreaterThan(1);
      await trashIcons[1].trigger("click");
      await flushPromises();
      await nextTick();

      expect(RecipeStepServices.deleteRecipeStep).toHaveBeenCalled();
      expect(wrapper.text()).not.toContain("mix");
    });
  });
});
