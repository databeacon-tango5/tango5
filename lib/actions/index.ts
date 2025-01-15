import revalidateCacheTag from './actions';

export * from './scenarios';
export * from './usergames';

export type ActionState = { message: string; error: boolean };

export default revalidateCacheTag;
