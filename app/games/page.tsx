import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { UserGamesTable } from '~/components/users/usergames-table';
import { getUnplayedScenarios, getUserGames } from '~/lib/db/queries';
import { ScenarioSelect, UserGameSelect } from '~/lib/db/schema';

export default async function Page() {
    const user = await currentUser();

    let userGames: UserGameSelect[] = [];
    let unplayedScenarios: ScenarioSelect[] = [];
    if (user) {
        userGames = await getUserGames(user.id);
        unplayedScenarios = await getUnplayedScenarios(user.id);
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
            <h1 className="text-3xl">{'You have completed all available scenarios'}</h1>
            <h3 className="text-xl">{'Return later to access new scenarios'}</h3>
            <UserGamesTable usergames={userGames} admin={false} />
            <Button variant="outline">
                {unplayedScenarios.length === 0 ? (
                    <Link href="/play/random">Play random</Link>
                ) : (
                    <Link href="/play">Continue playing</Link>
                )}
            </Button>
        </main>
    );
}
