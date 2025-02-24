import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export const createClient = (databaseUrl: string) => {
    return new PrismaClient({
        datasourceUrl: databaseUrl
    }).$extends(withAccelerate()); 
}; 

const globalForPrisma = globalThis as unknown as { __db?: ReturnType<typeof createClient> };

export const getDatabase = (databaseUrl: string) => {
    if(!globalForPrisma.__db){
        globalForPrisma.__db = createClient(databaseUrl);
    }

    return globalForPrisma.__db; 
};