'use server';

import { Duration } from 'luxon';
import { currentUser } from '@clerk/nextjs/server';
import {
    deleteUserGames,
    writeScenario,
    writeUserGame,
    getUserGames,
    deleteScenario as deleteDBScenario
} from '~/lib/db/queries';
import { scenarioSchema } from '~/lib/domain/scenario';
import { revalidateTag } from 'next/cache';
import { UserGameInsert } from '~/lib/db/schema';

type ActionState = { message: string; error: boolean };

export async function createScenario(
    _prevState: ActionState,
    payload: { data: string; fileName: string }
): Promise<ActionState> {
    let json;

    try {
        json = JSON.parse(payload.data);
    } catch {
        return { message: `${payload.fileName} is not a valid JSON document`, error: true };
    }

    const scenarioData = scenarioSchema.safeParse(json);

    if (scenarioData.error) {
        return { message: `${payload.fileName} does not have the correct JSON schema`, error: true };
    }

    const result = await writeScenario(scenarioData.data);

    if (result.length === 0) {
        return { message: `Internal database error when saving ${payload.fileName}`, error: true };
    }

    return { message: `Scenario #${result[0].id} created from ${payload.fileName}`, error: false };
}

export async function deleteScenario(_prevState: ActionState, id: number): Promise<ActionState> {
    const result = await deleteDBScenario(id);

    if (result.length === 0) {
        return { message: `Scenario #${id} not found`, error: true };
    }

    return { message: `Scenario #${id} deleted`, error: false };
}

export default async function revalidateCacheTag(tag: string) {
    revalidateTag(tag);
}

export async function completeUserGame(scenarioId: number, playTimeMs: number, success: boolean) {
    const user = await currentUser();

    if (!user) {
        return;
    }

    const userGameScenarios = new Set((await getUserGames(user.id)).map((ug) => ug.scenarioId));
    if (userGameScenarios.has(scenarioId)) {
        return;
    }

    const playTime = Duration.fromMillis(playTimeMs).toString();
    const userGame: UserGameInsert = {
        userId: user.id,
        scenarioId,
        playTime,
        success
    };

    await writeUserGame(userGame);
}

export async function resetUserProgress(_prevState: ActionState, userId: string): Promise<ActionState> {
    try {
        await deleteUserGames(userId);
    } catch {
        return { message: `Error deleting games for user #${userId}`, error: true };
    }

    return { message: `Games for user #${userId} deleted`, error: false };
}
