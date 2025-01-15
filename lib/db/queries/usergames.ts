import { db } from '~/lib/db';
import { UserGameInsert, UserGamesTable } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

export const writeUserGame = async (userGame: UserGameInsert) => {
    return await db.insert(UserGamesTable).values(userGame).onConflictDoNothing().returning();
};

export const getUserGames = async (userId?: string) => {
    const query = db.select().from(UserGamesTable);

    if (userId) {
        query.where(eq(UserGamesTable.userId, userId));
    }

    return await query.execute();
};

export const deleteDBUserGame = async (id: number) => {
    return await db.delete(UserGamesTable).where(eq(UserGamesTable.id, id)).returning();
};
