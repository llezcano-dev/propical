/**
 * Regla de acceso al admin shell (hardening de superadmin).
 *
 * El layout de `/dashboard/admin/*` es un client component que llama
 * `notFound()` para cualquier user que no sea superadmin. Esta regla se
 * extrae como función pura para poder unit-testearla sin jsdom y para
 * que la decisión viva en un solo lugar (defensa en profundidad, más
 * allá del middleware que solo gatea `/api/admin/*`).
 */
export function canAccessAdmin(role: string | null | undefined): boolean {
  return role === "superadmin";
}
