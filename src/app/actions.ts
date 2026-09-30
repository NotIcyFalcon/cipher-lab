"use server";

export async function getLabAccessCode() {
  return process.env.NEXT_PUBLIC_LAB_ACCESS_CODE;
}
