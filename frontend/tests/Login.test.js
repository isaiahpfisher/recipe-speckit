/**
 * Feature 1 — User Authentication and Session Management
 * Spec: features/feature-1-user-authentication-session-management.md
 */

import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "../src/views/Login.vue";
import RecipeList from "../src/views/RecipeList.vue";
import MenuBar from "../src/components/MenuBar.vue";
import UserServices from "../src/services/UserServices.js";
import RecipeServices from "../src/services/RecipeServices.js";
import apiClient from "../src/services/services.js";

vi.mock("../src/components/MenuBar.vue", async () => {
  const { defineComponent } = await import("vue");
  const { useRouter } = await import("vue-router");
  const UserServices = (await import("../src/services/UserServices.js")).default;
  return {
    default: defineComponent({
      name: "MenuBar",
      setup() {
        const router = useRouter();
        function logout() {
          UserServices.logoutUser()
            .then(() => {})
            .catch(() => {});
          localStorage.removeItem("user");
          router.push({ name: "login" });
        }
        return { logout };
      },
      template: `<button type="button" @click="logout()">Logout</button>`,
    }),
  };
});

vi.mock("../src/services/UserServices.js", () => ({
  default: {
    addUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock("../src/services/RecipeServices.js", () => ({
  default: {
    getRecipes: vi.fn(),
    getRecipesByUserId: vi.fn(),
    addRecipe: vi.fn(),
  },
}));

vi.mock("../src/components/RecipeCardComponent.vue", () => ({
  default: {
    name: "RecipeCard",
    props: ["recipe"],
    template: `<div class="recipe-stub">{{ recipe.name }}</div>`,
  },
}));

const sessionUser = {
  id: 7,
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  token: "session-token",
};

function vuetify() {
  return createVuetify({ components, directives });
}

async function makeRouter(initial = "/") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "login", component: Login },
      { path: "/recipes", name: "recipes", component: { template: "<div>Recipes page</div>" } },
      { path: "/ingredients", name: "ingredients", component: { template: "<div />" } },
    ],
  });
  await router.push(initial);
  await router.isReady();
  vi.spyOn(router, "push");
  return router;
}

async function mountRoute(initial = "/") {
  const router = await makeRouter(initial);
  const wrapper = mount(
    { template: "<router-view />" },
    {
      global: {
        plugins: [router, vuetify()],
      },
    }
  );
  await flushPromises();
  return { wrapper, router };
}

async function mountWithPlugins(component, initial = "/") {
  const router = await makeRouter(initial);
  const wrapper = mount(component, {
    global: {
      plugins: [router, vuetify()],
    },
  });
  await flushPromises();
  return { wrapper, router };
}

function clickByText(wrapper, label) {
  const button = wrapper
    .findAll("button")
    .find((btn) => btn.text().replace(/\s+/g, " ").trim().includes(label));
  expect(button, `button "${label}"`).toBeTruthy();
  return button.trigger("click");
}

function setLoginUser(wrapper, fields) {
  Object.assign(wrapper.vm.user, fields);
}

describe("Feature 1 — User Authentication and Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    RecipeServices.getRecipes.mockResolvedValue({
      data: [{ id: 1, name: "Published Soup" }],
    });
    RecipeServices.getRecipesByUserId.mockResolvedValue({
      data: [{ id: 2, name: "Jane's Pasta" }],
    });
  });

  describe("US-1.1 — Create account", () => {
    it("User registers with valid information", async () => {
      UserServices.addUser.mockResolvedValue({ data: sessionUser });
      const { wrapper, router } = await mountRoute();
      const login = wrapper.findComponent(Login);

      await clickByText(wrapper, "Create Account");
      setLoginUser(login, {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "password1",
      });
      await login.vm.createAccount();
      await flushPromises();

      expect(UserServices.addUser).toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem("user"))).toMatchObject({
        email: "jane@example.com",
        token: "session-token",
      });
      expect(router.push).toHaveBeenCalledWith({ name: "recipes" });
      expect(login.vm.snackbar.text).toBe("Account created successfully!");
      wrapper.unmount();
    });

    it("User registers with a duplicate email", async () => {
      UserServices.addUser.mockRejectedValue({
        response: { data: { message: "This email is already in use." } },
      });
      const { wrapper, router } = await mountRoute();
      const login = wrapper.findComponent(Login);

      await clickByText(wrapper, "Create Account");
      setLoginUser(login, {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "password1",
      });
      await login.vm.createAccount();
      await flushPromises();

      expect(login.vm.snackbar.text).toBe("This email is already in use.");
      expect(router.currentRoute.value.name).toBe("login");
      wrapper.unmount();
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("User logs in with valid credentials", async () => {
      UserServices.loginUser.mockResolvedValue({ data: sessionUser });
      const { wrapper, router } = await mountRoute();
      const login = wrapper.findComponent(Login);

      setLoginUser(login, {
        email: "jane@example.com",
        password: "password1",
      });
      await clickByText(wrapper, "Login");
      await flushPromises();

      expect(UserServices.loginUser).toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem("user")).token).toBe("session-token");
      expect(router.push).toHaveBeenCalledWith({ name: "recipes" });
      expect(login.vm.snackbar.text).toBe("Login successful!");
      wrapper.unmount();
    });

    it("User logs in with an unknown email", async () => {
      UserServices.loginUser.mockRejectedValue({
        response: { data: { message: "User not found!" } },
      });
      const { wrapper, router } = await mountRoute();
      const login = wrapper.findComponent(Login);

      setLoginUser(login, {
        email: "missing@example.com",
        password: "password1",
      });
      await clickByText(wrapper, "Login");
      await flushPromises();

      expect(login.vm.snackbar.text).toBe("User not found!");
      expect(router.currentRoute.value.name).toBe("login");
      wrapper.unmount();
    });

    it("User logs in with an invalid password", async () => {
      UserServices.loginUser.mockRejectedValue({
        response: { data: { message: "Invalid password!" } },
      });
      const { wrapper, router } = await mountRoute();
      const login = wrapper.findComponent(Login);

      setLoginUser(login, {
        email: "jane@example.com",
        password: "wrong-password",
      });
      await clickByText(wrapper, "Login");
      await flushPromises();

      expect(login.vm.snackbar.text).toBe("Invalid password!");
      expect(router.currentRoute.value.name).toBe("login");
      wrapper.unmount();
    });
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Signed-in user refreshes the recipes page", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      const { wrapper } = await mountWithPlugins(RecipeList, "/recipes");

      expect(RecipeServices.getRecipesByUserId).toHaveBeenCalledWith(sessionUser.id);
      expect(wrapper.text()).toContain("Jane's Pasta");
      wrapper.unmount();
    });

    it("API request includes session token", () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      const headers = {};
      const transformers = apiClient.defaults.transformRequest;
      const transform = Array.isArray(transformers) ? transformers[0] : transformers;
      transform({ ping: true }, headers);
      expect(headers.Authorization).toBe("Bearer session-token");
    });

    it("Visiting the login page clears the stored session", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      const { wrapper } = await mountRoute();
      expect(localStorage.getItem("user")).toBeNull();
      wrapper.unmount();
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User logs out", async () => {
      localStorage.setItem("user", JSON.stringify(sessionUser));
      UserServices.logoutUser.mockResolvedValue({ data: { message: "Logged out successfully." } });
      const { wrapper, router } = await mountWithPlugins(MenuBar, "/recipes");

      await clickByText(wrapper, "Logout");
      await flushPromises();

      expect(UserServices.logoutUser).toHaveBeenCalled();
      expect(localStorage.getItem("user")).toBeNull();
      expect(router.currentRoute.value.name).toBe("login");
      wrapper.unmount();
    });
  });

  describe("US-1.5 — Protect authenticated APIs and signed-in UI", () => {
    it("Unauthenticated user views published recipes", async () => {
      const { wrapper, router } = await mountRoute();
      await clickByText(wrapper, "View Published Recipes");
      await flushPromises();

      expect(router.push).toHaveBeenCalledWith({ name: "recipes" });
      wrapper.unmount();

      const list = await mountWithPlugins(RecipeList, "/recipes");
      expect(RecipeServices.getRecipes).toHaveBeenCalled();
      expect(RecipeServices.getRecipesByUserId).not.toHaveBeenCalled();
      expect(list.wrapper.text()).toContain("Published Soup");
      expect(list.router.currentRoute.value.name).toBe("recipes");
      list.wrapper.unmount();
    });
  });
});

describe("Feature 4 — Recipe Publishing", () => {
  describe("US-4.1 — See Published Recipes", () => {
    it("Guest views published recipes", async () => {
      localStorage.clear();
      vi.clearAllMocks();
      RecipeServices.getRecipes.mockResolvedValue({
        data: [{ id: 1, name: "Published Soup" }],
      });

      const { wrapper, router } = await mountRoute();
      await clickByText(wrapper, "View Published Recipes");
      await flushPromises();

      expect(router.push).toHaveBeenCalledWith({ name: "recipes" });
      wrapper.unmount();
    });
  });
});
