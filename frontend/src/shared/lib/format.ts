export function formatDate(value: string | null): string {
  if (!value) return "Not yet opened";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
