import { getUsers } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton, StubNotice, Toolbar } from "@/components/Toolbar";
import { UsersTable } from "@/components/UsersTable";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <>
      <PageHeader
        title="Users"
        description="People with access to this tool and what they can do."
        actions={<PrimaryButton>Invite user</PrimaryButton>}
      />
      <Toolbar searchPlaceholder="Search users…" resultCount={`${users.length} users`} />
      <StubNotice>
        This page renders stubbed data. Once the APIM route is live, swap{" "}
        <code className="font-mono-data">getUsers()</code> in{" "}
        <code className="font-mono-data">src/lib/apim.ts</code> for a real request.
      </StubNotice>
      <UsersTable users={users} />
    </>
  );
}
