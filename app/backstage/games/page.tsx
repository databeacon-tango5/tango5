import { UserGamesTable } from '~/components/users/usergames-table';
import { getUserGames } from '~/lib/db/queries';

export default async function App() {
    const userGames = await getUserGames();

    return (
        <main className="flex flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div>
                <h3>Games by User</h3>
                <UserGamesTable usergames={userGames} admin={true} />
            </div>
        </main>
    );
}
