import type { PublicUser, UserRole } from "@/lib/users";

export class AccessDeniedError extends Error {
  constructor() {
    super("Недостаточно прав");
    this.name = "AccessDeniedError";
  }
}

export function assertRole(user: PublicUser, role: UserRole): void {
  if (user.role !== role) {
    throw new AccessDeniedError();
  }
}
