import { createErrorResponse } from "../utils/jwt";

export async function onRequestPost(context) {
  const {} = context;

  try {
    return new Response(
      JSON.stringify({
        success: true,
        message: "Logged out successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return createErrorResponse("An error occurred during logout", 500);
  }
}
