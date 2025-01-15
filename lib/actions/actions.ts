'use server';

import { revalidateTag } from 'next/cache';

export default async function revalidateCacheTag(tag: string) {
    revalidateTag(tag);
}
