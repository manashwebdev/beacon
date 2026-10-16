import mongoose from "mongoose";
import { PostM, ProjectM } from "../models";
import { atLeast, roleOf, Role } from "./access";

// Both helpers return null unless the user holds at least `min` on the project.
export async function projectAccess(user: any, id: string, min: Role) {
  if (!user || !mongoose.isValidObjectId(id)) return null;
  const project: any = await ProjectM.findById(id).lean();
  const role = roleOf(project, user._id);
  return atLeast(role, min) ? { project, user, role: role as Role } : null;
}

export async function postAccess(user: any, id: string, min: Role) {
  if (!mongoose.isValidObjectId(id)) return null;
  const post: any = await PostM.findById(id);
  if (!post) return null;
  const a = await projectAccess(user, String(post.project), min);
  return a ? { post, ...a } : null;
}
