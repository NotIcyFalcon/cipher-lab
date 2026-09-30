import { prisma } from "./db";

export async function getCurrentUser() {
  const username = "Ronak"; // Hardcoded for this personal lab

  let user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { username },
    });
  }

  return user;
}
