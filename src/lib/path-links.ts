export function pathHref(id: string) {
  return `/?${new URLSearchParams({ path: id })}`;
}

export function pathRevisionHref(id: string) {
  return `/?${new URLSearchParams({ path: id, revise: "1" })}`;
}
