export function buildQuery(query): string {
  let path = "";

  if (query) {
    const queryString = Object.entries(query).map(([key, value]) => {
      return `${key}=${value}`;
    });

    path = `?${queryString.join("&")}`;
  }

  return path;
}
