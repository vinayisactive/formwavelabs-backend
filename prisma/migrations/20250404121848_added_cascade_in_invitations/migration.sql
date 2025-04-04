-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_workspaceId_fkey";

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
