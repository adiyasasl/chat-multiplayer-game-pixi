// prisma.js — Like a static DB Connection Pool
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;