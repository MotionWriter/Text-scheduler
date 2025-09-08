import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireUser(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}