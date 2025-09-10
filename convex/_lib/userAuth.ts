import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireUser(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>
) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    // Dev-only bypass: allow selecting a default user when no auth is present
    if (process.env.ALLOW_DEV_IMPORT_BYPASS === "true") {
      const anyUser = await ctx.db.query("users").first();
      if (!anyUser) {
        throw new Error(
          "Dev bypass enabled but no users exist. Please sign in once or create a test user."
        );
      }
      return anyUser as any;
    }
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
