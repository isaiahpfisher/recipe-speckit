/**
 * Feature 2 — Ingredient Management
 * Spec: features/feature-2-ingredient-management.md
 */

import { nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import IngredientList from "../src/views/IngredientList.vue";
import IngredientServices from "../src/services/IngredientServices.js";

vi.mock("../src/services/IngredientServices.js", () => ({
  default: {
    getIngredients: vi.fn(),
    getIngredient: vi.fn(),
    addIngredient: vi.fn(),
    updateIngredient: vi.fn(),
    deleteIngredient: vi.fn(),
  },
}));

const vuetify = createVuetify({ components, directives });

const units = [
  "cup",
  "gallon",
  "gram",
  "kilogram",
  "liter",
  "milliliter",
  "ounce",
  "pint",
  "piece",
  "pound",
  "quart",
  "tablespoon",
  "teaspoon",
  "unit",
];

const peanutButter = {
  id: 1,
  name: "Peanut Butter",
  unit: "ounce",
  pricePerUnit: "0.07",
};

const jelly = {
  id: 2,
  name: "Jelly",
  unit: "cup",
  pricePerUnit: "0.12",
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

const dialogStub = {
  name: "VDialog",
  props: {
    modelValue: { type: Boolean, default: false },
  },
  template: `<div class="v-dialog-stub"><slot v-if="modelValue" /></div>`,
};

function mountList() {
  return mount(IngredientList, {
    global: {
      plugins: [vuetify],
      stubs: {
        VDialog: dialogStub,
      },
    },
  });
}

function buttonByText(wrapper, text) {
  return wrapper
    .findAll("button")
    .find((button) => button.text().trim() === text);
}

function fieldByLabel(wrapper, label) {
  return wrapper
    .findAllComponents({ name: "VTextField" })
    .find((field) => field.props("label") === label);
}

function rowByName(wrapper, name) {
  return wrapper.findAll("tbody tr").find((row) => row.text().includes(name));
}

describe("Feature 2 — Ingredient Management", () => {
  let wrapper;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
  });

  describe("US-2.1 — Create ingredients", () => {
    it("User views add dialog", async () => {
      signIn();
      IngredientServices.getIngredients.mockResolvedValue({ data: [] });

      wrapper = mountList();
      await flushPromises();

      await buttonByText(wrapper, "Add").trigger("click");
      await nextTick();

      const dialog = wrapper.findComponent({ name: "VDialog" });
      expect(dialog.props("modelValue")).toBe(true);
      expect(fieldByLabel(wrapper, "Name").exists()).toBe(true);
      expect(fieldByLabel(wrapper, "Price Per Unit").exists()).toBe(true);
      expect(
        wrapper.findComponent({ name: "VSelect" }).props("items")
      ).toEqual(units);
    });

    it("User creates a new ingredient", async () => {
      signIn();
      IngredientServices.getIngredients
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValue({ data: [peanutButter] });
      IngredientServices.addIngredient.mockResolvedValue({
        status: 200,
        data: {
          id: 1,
          name: "Peanut Butter",
          unit: "ounce",
          pricePerUnit: "0.07",
        },
      });

      wrapper = mountList();
      await flushPromises();

      await buttonByText(wrapper, "Add").trigger("click");
      await nextTick();

      await fieldByLabel(wrapper, "Name").find("input").setValue("Peanut Butter");
      await wrapper
        .findComponent({ name: "VSelect" })
        .setValue("ounce");
      await fieldByLabel(wrapper, "Price Per Unit")
        .find("input")
        .setValue("0.07");
      await buttonByText(wrapper, "Add Ingredient").trigger("click");
      await flushPromises();

      const response = await IngredientServices.addIngredient.mock.results[0]
        .value;
      expect(response.status).toBe(200);
      expect(response.data).toEqual(
        expect.objectContaining({
          id: 1,
          name: "Peanut Butter",
          unit: "ounce",
          pricePerUnit: "0.07",
        })
      );
      expect(wrapper.text()).toContain("Peanut Butter");
      expect(wrapper.findComponent({ name: "VDialog" }).props("modelValue")).toBe(
        false
      );
    });
  });

  describe("US-2.2 — View ingredients", () => {
    it("Ingredients page loads with existing ingredients", async () => {
      IngredientServices.getIngredients.mockResolvedValue({
        data: [peanutButter, jelly],
      });

      wrapper = mountList();
      await flushPromises();

      const peanutRow = rowByName(wrapper, "Peanut Butter");
      const jellyRow = rowByName(wrapper, "Jelly");
      expect(peanutRow).toBeTruthy();
      expect(jellyRow).toBeTruthy();
      expect(peanutRow.text()).toContain("ounce");
      expect(peanutRow.text()).toContain("$0.07");
      expect(peanutRow.find(".mdi-pencil").exists()).toBe(true);
      expect(jellyRow.find(".mdi-pencil").exists()).toBe(true);
    });

    it("There exist no ingredients", async () => {
      IngredientServices.getIngredients.mockResolvedValue({ data: [] });

      wrapper = mountList();
      await flushPromises();

      expect(
        wrapper.findAll("th").map((header) => header.text().trim())
      ).toEqual(["Name", "Unit", "Price Per Unit", "Actions"]);
      expect(wrapper.findAll("tbody tr")).toHaveLength(0);
    });
  });

  describe("US-2.3 — Manage ingredient row actions", () => {
    it("Ingredient rows show edit action", async () => {
      IngredientServices.getIngredients.mockResolvedValue({
        data: [peanutButter],
      });

      wrapper = mountList();
      await flushPromises();

      const row = rowByName(wrapper, "Peanut Butter");
      expect(row.find(".mdi-pencil").exists()).toBe(true);
    });
  });

  describe("US-2.4 — Manage ingredient row display", () => {
    it("Ingredient rows show correct columns", async () => {
      IngredientServices.getIngredients.mockResolvedValue({
        data: [peanutButter],
      });

      wrapper = mountList();
      await flushPromises();

      const row = rowByName(wrapper, "Peanut Butter");
      expect(row.text()).toContain("ounce");
      expect(row.text()).toContain("$0.07");
    });
  });

  describe("US-2.5 — Edit ingredients", () => {
    it("User renames an ingredient", async () => {
      signIn();
      IngredientServices.getIngredients
        .mockResolvedValueOnce({ data: [peanutButter] })
        .mockResolvedValue({
          data: [{ ...peanutButter, name: "Jelly" }],
        });
      IngredientServices.updateIngredient.mockResolvedValue({
        status: 200,
        data: { message: "Ingredient was updated successfully." },
      });

      wrapper = mountList();
      await flushPromises();

      await rowByName(wrapper, "Peanut Butter").find(".mdi-pencil").trigger("click");
      await nextTick();
      await fieldByLabel(wrapper, "Name").find("input").setValue("Jelly");
      await buttonByText(wrapper, "Update Ingredient").trigger("click");
      await flushPromises();

      const response = await IngredientServices.updateIngredient.mock.results[0]
        .value;
      expect(response.status).toBe(200);
      expect(response.data.message).toBe(
        "Ingredient was updated successfully."
      );
      expect(wrapper.text()).toContain("Jelly");
      expect(wrapper.text()).not.toContain("Peanut Butter");
    });

    it("User changes ingredient unit", async () => {
      signIn();
      const gallonIngredient = { ...peanutButter, unit: "gallon" };
      IngredientServices.getIngredients
        .mockResolvedValueOnce({ data: [gallonIngredient] })
        .mockResolvedValue({
          data: [{ ...gallonIngredient, unit: "ounce" }],
        });
      IngredientServices.updateIngredient.mockResolvedValue({
        status: 200,
        data: { message: "Ingredient was updated successfully." },
      });

      wrapper = mountList();
      await flushPromises();

      await rowByName(wrapper, "Peanut Butter").find(".mdi-pencil").trigger("click");
      await nextTick();
      await wrapper.findComponent({ name: "VSelect" }).setValue("ounce");
      await buttonByText(wrapper, "Update Ingredient").trigger("click");
      await flushPromises();

      const response = await IngredientServices.updateIngredient.mock.results[0]
        .value;
      expect(response.status).toBe(200);
      expect(response.data.message).toBe(
        "Ingredient was updated successfully."
      );
      expect(rowByName(wrapper, "Peanut Butter").text()).toContain("ounce");
      expect(rowByName(wrapper, "Peanut Butter").text()).not.toContain("gallon");
    });

    it("User changes ingredient price", async () => {
      signIn();
      const pricedIngredient = { ...peanutButter, pricePerUnit: "4.00" };
      IngredientServices.getIngredients
        .mockResolvedValueOnce({ data: [pricedIngredient] })
        .mockResolvedValue({
          data: [{ ...pricedIngredient, pricePerUnit: "0.23" }],
        });
      IngredientServices.updateIngredient.mockResolvedValue({
        status: 200,
        data: { message: "Ingredient was updated successfully." },
      });

      wrapper = mountList();
      await flushPromises();

      await rowByName(wrapper, "Peanut Butter").find(".mdi-pencil").trigger("click");
      await nextTick();
      await fieldByLabel(wrapper, "Price Per Unit").find("input").setValue("0.23");
      await buttonByText(wrapper, "Update Ingredient").trigger("click");
      await flushPromises();

      const response = await IngredientServices.updateIngredient.mock.results[0]
        .value;
      expect(response.status).toBe(200);
      expect(response.data.message).toBe(
        "Ingredient was updated successfully."
      );
      expect(wrapper.text()).toContain("$0.23");
      expect(wrapper.text()).not.toContain("$4.00");
    });
  });

  describe("US-2.6 — Private access to create and edit ingredients only", () => {
    it("Unauthenticated user accesses the ingredients page", async () => {
      IngredientServices.getIngredients.mockResolvedValue({
        data: [peanutButter],
      });

      wrapper = mountList();
      await flushPromises();

      expect(wrapper.text()).toContain("Peanut Butter");
      expect(buttonByText(wrapper, "Add")).toBeUndefined();
    });

    it("Unauthenticated API request to update ingredient", async () => {
      IngredientServices.getIngredients.mockResolvedValue({
        data: [peanutButter],
      });
      IngredientServices.updateIngredient.mockRejectedValue({
        response: {
          status: 401,
          data: { message: "Unauthorized! No Auth Header" },
        },
      });

      wrapper = mountList();
      await flushPromises();

      await rowByName(wrapper, "Peanut Butter").find(".mdi-pencil").trigger("click");
      await nextTick();
      await buttonByText(wrapper, "Update Ingredient").trigger("click");
      await flushPromises();

      expect(IngredientServices.updateIngredient).toHaveBeenCalled();
      const result = IngredientServices.updateIngredient.mock.results[0];
      const error =
        result.type === "return" ? await result.value : result.value;
      expect(error.response.status).toBe(401);
      expect(error.response.data.message).toMatch(/unauthorized/i);
    });
  });
});
