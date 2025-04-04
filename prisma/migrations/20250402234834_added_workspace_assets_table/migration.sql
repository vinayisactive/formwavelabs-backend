-- CreateTable
CREATE TABLE "WorkspaceAssets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "WorkspaceAssets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkspaceAssets" ADD CONSTRAINT "WorkspaceAssets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
