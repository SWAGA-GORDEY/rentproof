import { logoutAction } from "@/app/actions/auth";
import { secondaryButton } from "@/components/styles";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className={secondaryButton}>
        Выйти
      </button>
    </form>
  );
}
