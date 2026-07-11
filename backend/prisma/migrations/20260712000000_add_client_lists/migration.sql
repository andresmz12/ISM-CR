-- CreateTable
CREATE TABLE "client_lists" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_list_items" (
    "clientId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_list_items_pkey" PRIMARY KEY ("clientId","listId")
);

-- CreateIndex
CREATE INDEX "client_lists_projectId_idx" ON "client_lists"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "client_lists_projectId_name_key" ON "client_lists"("projectId", "name");

-- CreateIndex
CREATE INDEX "client_list_items_listId_idx" ON "client_list_items"("listId");

-- AddForeignKey
ALTER TABLE "client_lists" ADD CONSTRAINT "client_lists_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_list_items" ADD CONSTRAINT "client_list_items_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_list_items" ADD CONSTRAINT "client_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "client_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

