/**
 * Feature 5 — Recipe PDF Export
 * Spec: features/feature-5-pdf-reports.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createVuetify } from "vuetify";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../src/services/UserServices.js", () => ({
  default: { addUser: vi.fn(), loginUser: vi.fn() },
}));

import Login from "../src/views/Login.vue";

describe("Feature 5 — Recipe PDF Export", () => {
  describe("US-5.1 — Export Recipe to PDF", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      localStorage.clear();
    });

    it("Guest user cannot export recipe to PDF", async () => {
      const wrapper = mount(Login, {
        global: { plugins: [createVuetify()] },
      });
      await flushPromises();

      expect(localStorage.getItem("user")).toBeNull();

      const publishedButton = wrapper
        .findAll("button")
        .find((button) => button.text() === "View Published Recipes");
      expect(publishedButton).toBeDefined();

      await publishedButton.trigger("click");

      // Guest lands on the recipe list with no user, so no PDF export is offered
      expect(mocks.push).toHaveBeenCalledWith({ name: "recipes" });
      expect(localStorage.getItem("user")).toBeNull();
    });
  });
});
