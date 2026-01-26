import { Elysia } from "elysia";

export const authMiddleware = new Elysia().derive(({ headers }) => {
  const token = headers.authorization?.replace("Bearer ", "");

  return {
    user: token
      ? {
          id: "user-id",
          email: "user@example.com",
        }
      : null,
  };
});
