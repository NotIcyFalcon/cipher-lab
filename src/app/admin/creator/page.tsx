import { redirect } from "next/navigation";
import { requireUserId } from "@/server/current-user";

export default async function CreatorIndexPage() {
  const user = await requireUserId();

  if (user !== "admin") {
    return null;
  }

  redirect("/admin/creator/topics");
}
