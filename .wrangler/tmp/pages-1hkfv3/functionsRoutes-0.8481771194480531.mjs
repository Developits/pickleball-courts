import { onRequestPost as __api_auth_login_js_onRequestPost } from "C:\\Users\\Nahid\\Workspace\\pickleball-courts\\functions\\api\\auth\\login.js"
import { onRequestPost as __api_auth_register_js_onRequestPost } from "C:\\Users\\Nahid\\Workspace\\pickleball-courts\\functions\\api\\auth\\register.js"

export const routes = [
    {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_js_onRequestPost],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_js_onRequestPost],
    },
  ]