'use server';

import { Duration } from 'luxon';
import { currentUser } from '@clerk/nextjs/server';
import { writeScenario, writeUserGame } from '~/lib/db/queries';
import { scenarioSchema } from '~/lib/domain/scenario';
import { deleteScenario as deleteDBScenario } from '~/lib/db/queries';
import { revalidateTag } from 'next/cache';
import { UserGame } from '~/lib/db/schema';
import { PostHog } from 'posthog-node';
import { posthogBackEvents } from '../constants';

type ActionState = { message: string; error: boolean };

const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST
});

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

export async function startUserGame(scenarioId: number, startTime: number) {
    const user = await currentUser();

    if (!user) {
        return;
    }

    const userGame = {
        userId: user.id,
        scenarioId,
        startTime
    };

    client.capture({
        distinctId: userGame.userId,
        event: posthogBackEvents.gameStart,
        properties: { ...userGame }
    });
}

export async function completeUserGame(scenarioId: number, playTimeMs: number, success: boolean) {
    const user = await currentUser();

    if (!user) {
        return;
    }

    const playTime = Duration.fromMillis(playTimeMs).toString();
    const userGame: UserGame = {
        userId: user.id,
        scenarioId,
        playTime,
        success
    };

    await writeUserGame(userGame);

    const eventType = userGame.success ? posthogBackEvents.gameEndSuccess : posthogBackEvents.gameEndFailure;
    client.capture({
        distinctId: userGame.userId,
        event: eventType,
        properties: { ...userGame }
    });
}

await client.shutdown();
