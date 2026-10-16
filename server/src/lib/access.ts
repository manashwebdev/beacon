// Authorization model. Roles, lowest to highest: viewer < editor < admin < owner.
//  viewer: read the dashboard and analytics
//  editor: also change status, reply to users, comment as the team
//  admin:  also delete ideas and manage viewers/editors
//  owner:  also manage admins and delete the project
export type Role = "owner" | "admin" | "editor" | "viewer";
export const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export function roleOf(project: any, userId: any): Role | null {
  if (!project || !userId) return null;
  if (String(project.owner) === String(userId)) return "owner";
  const m = (project.members || []).find((x: any) => String(x.user) === String(userId));
  return m ? (m.role as Role) : null;
}
export const atLeast = (r: Role | null, min: Role) => !!r && RANK[r] >= RANK[min];
