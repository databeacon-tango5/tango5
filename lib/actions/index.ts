import { revalidateTag } from 'next/cache';

export type ActionState = { message: string; error: boolean };

export default async function revalidateCacheTag(tag: string) {
    revalidateTag(tag);
}
