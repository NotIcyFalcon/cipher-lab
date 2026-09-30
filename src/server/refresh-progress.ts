import "server-only";
import { revalidatePath } from "next/cache";

export function refreshProgress() {
  revalidatePath("/", "layout");
}
