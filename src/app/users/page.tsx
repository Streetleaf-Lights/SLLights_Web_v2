import { getCustomers, getUsers } from "@/lib/apim";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { Toolbar } from "@/components/Toolbar";
import { UsersTable } from "@/components/UsersTable";
import { InviteUserModal } from "@/components/InviteUserModal";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const sessionUser = await getSessionUser();
  const isCustomerAdmin = sessionUser?.role === "Customer Admin";

  // A Customer Admin only manages their own customer's users, and can't
  // invite new ones — that's Streetleaf-Admin-only — so skip getCustomers()
  // entirely for them; it exists solely to populate the invite modal.
  const [allUsers, customers] = await Promise.all([
    getUsers(),
    isCustomerAdmin ? Promise.resolve([]) : getCustomers(),
  ]);

  const users = isCustomerAdmin
    ? allUsers.filter((u) => u.customerId === sessionUser?.customerId)
    : allUsers;

  return (
    <>
      <PageHeader
        title="Users"
        description="People with access to this tool and what they can do."
        actions={!isCustomerAdmin && <InviteUserModal customers={customers} />}
      />
      <Toolbar searchPlaceholder="Search users…" resultCount={`${users.length} users`} />
      <UsersTable users={users} canDelete={!isCustomerAdmin} />
    </>
  );
}
