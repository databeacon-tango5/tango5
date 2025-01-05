'use server';

import { writeScenario } from '~/lib/db/queries';
import { scenarioSchema } from '~/lib/domain/scenario';
import { deleteScenario as deleteDBScenario } from '~/lib/db/queries';
import { revalidateTag } from 'next/cache';

type ActionState = { message: string };

export async function createScenario(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    const data = formData.get('data');

    if (!data) return { message: 'Internal error' };

    if (typeof data !== 'string') return { message: 'The file must be UTF-8 encoded' };

    let json;

    try {
        json = JSON.parse(data);
    } catch {
        return { message: 'The file must be valid JSON document' };
    }

    const scenarioData = scenarioSchema.safeParse(json);

    if (scenarioData.error) return { message: 'The file must have the correct JSON schema' };

    const result = await writeScenario(data);

    if (result.length === 0) return { message: `Internal database error` };

    revalidateTag('scenarios');

    return { message: `Scenario saved with id #${result[0].id}` };
}

export async function deleteScenario(_prevState: ActionState, formData: FormData): Promise<ActionState> {
    const scenarioId = formData.get('scenarioId');

    if (!scenarioId || typeof scenarioId !== 'string') return { message: 'Internal error' };

    const id = parseInt(scenarioId, 10);

    const result = await deleteDBScenario(id);

    if (result.length === 0) return { message: `Scenario with id #${id} not found` };

    revalidateTag('scenarios');

    return { message: `Scenario with id #${id} deleted successfully` };
}
