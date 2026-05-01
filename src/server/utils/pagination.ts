export function getPagination(query: any) {
  const page = parseInt(query.page as string) || 1;
  const pageSize = parseInt(query.pageSize as string) || 20;
  const skip = (page - 1) * pageSize;
  const take = Math.min(pageSize, 100); // Máximo de 100 por página por segurança

  return { skip, take };
}
