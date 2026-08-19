import { getCustomer, getCustomers, getUsers } from "@/lib/apim";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { Toolbar } from "@/components/Toolbar";
import { UsersTable } from "@/components/UsersTable";
import { InviteUserModal } from "@/components/InviteUserModal";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const sessionUser = await getSessionUser();
  const isCustomerAdmin = sessionUser?.role === "Customer Admin";
  const isStreetleafAdmin = sessionUser?.role === "Streetleaf Admin";
  const isPlainUser = sessionUser?.role === "User";

  // Viewing scope: who this person can see in the list at all. A Customer
  // Admin and a "Customer User" (a plain User who does belong to a
  // customer) both only see their own customer's people — a "Streetleaf
  // User" (a plain User with no customer) sees everyone, same as a
  // Streetleaf Admin.
  const isCustomerScoped = isCustomerAdmin || (isPlainUser && sessionUser?.customerId != null);

  // Management capability: whether Delete/Invite/Re-invite show at all —
  // separate from viewing scope above. A plain User (Streetleaf or
  // Customer) never gets this, regardless of how much of the list they
  // can see. Streetleaf Admin and Customer Admin both get it, but never
  // for their own row (see currentUserId below) — deleting/re-inviting
  // yourself isn't a real scenario this UI needs to support.
  const canManageUsers = isStreetleafAdmin || isCustomerAdmin;

  // A Customer Admin only manages their own customer's users, and can't
  // browse/search the full customer list (that's Streetleaf-Admin-only
  // for their own invite flow) — so skip getCustomers() for them, and
  // instead fetch just their own customer record, to lock the invite
  // modal to it (no search, always that one customer).
  const [allUsers, customers, ownCustomer] = await Promise.all([
    getUsers(),
    isCustomerAdmin ? Promise.resolve([]) : getCustomers(),
    isCustomerAdmin && sessionUser?.customerId
      ? getCustomer(sessionUser.customerId)
      : Promise.resolve(undefined),
  ]);

  const users = isCustomerScoped
    ? allUsers.filter((u) => u.customerId === sessionUser?.customerId)
    : allUsers;

  return (
    <>
      <PageHeader
        title="Users"
        description="People with access to this tool and what they can do."
        actions={
          canManageUsers && (
            <InviteUserModal customers={customers} lockedCustomer={ownCustomer} />
          )
        }
      />
      <Toolbar searchPlaceholder="Search users…" resultCount={`${users.length} users`} />
      <UsersTable
        users={users}
        canManageUsers={canManageUsers}
        currentUserId={sessionUser?.id}
        customerScoped={isCustomerScoped}
      />
    </>
  );
}
