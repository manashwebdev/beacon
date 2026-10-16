import { redirect } from "next/navigation";
import { serverUser } from "@/lib/server";

// Server-side gate. Runs before anything renders and asks the API who the visitor is,
// so deleted accounts and signed-out sessions are turned away too.
export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await serverUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
