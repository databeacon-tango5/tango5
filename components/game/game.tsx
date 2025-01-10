'use client';

import { PropsWithoutRef, useEffect, useRef, useState } from 'react';
import { ScenarioMap } from '~/components/scenario/scenario-map';
import { Scenario } from '~/lib/domain/scenario';
import { Button } from '~/components/ui/button';
import { redirect } from 'next/navigation';
import { GameOver } from './game-over';

const GAME_TIMEOUT_MS = 30_000;

const Game = (props: PropsWithoutRef<{ scenario: Scenario }>) => {
    // Game related state
    const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
    const [selectedPairs, setSelectedPairs] = useState<[string, string][]>([]);
    const [isGameOver, setGameOver] = useState(false);
    const [report, setReport] = useState('');
    const [isReportOpen, setReportOpen] = useState(false);
    const gameStartTimeMs = useRef<number | undefined>(undefined);

    // required from effects clean up
    const timeOutId = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        if (typeof gameStartTimeMs.current === 'undefined') {
            gameStartTimeMs.current = performance.now();
        }

        timeOutId.current = setTimeout(() => {
            setGameOver(true);
        }, GAME_TIMEOUT_MS);

        return () => clearTimeout(timeOutId.current);
    }, []);

    useEffect(() => {
        if (isGameOver) {
            const correct = selectedPairs.filter((pair) =>
                props.scenario.pcds.some(
                    (pcd) =>
                        (pcd.firstId === pair[0] && pcd.secondId === pair[1]) ||
                        (pcd.firstId === pair[1] && pcd.secondId === pair[0])
                )
            );

            const elapsed = gameStartTimeMs.current ? performance.now() - gameStartTimeMs.current : 0;

            setReport(
                `Guessed ${correct.length} correct PCDs out of ${props.scenario.pcds.length} in ${formatMs(elapsed)}`
            );
            setReportOpen(true);
        }
    }, [isGameOver, props.scenario.pcds, selectedPairs]);

    useEffect(() => {
        // check if all pairs have been guessed
        if (selectedPairs.length === props.scenario.pcds.length) {
            setGameOver(true);
            return;
        }
    }, [props.scenario.pcds.length, selectedPairs.length]);

    const selectFlight = (id: string) => {
        // if the game is over do not allow further interactions and open report again to hint the user
        if (isGameOver) {
            setReportOpen(true);
            return;
        }

        const flight = props.scenario.flights.find((flight) => flight.id === id);

        // this should never happen, fail silently
        if (!flight) return;

        // if flight is not on any pair, is game over
        if (!props.scenario.pcds.some(({ firstId, secondId }) => firstId === flight.id || secondId === flight.id)) {
            setGameOver(true);
            return;
        }

        // if there is no previous selection, just select current flight (we already know is part of a pcd pair)
        if (!selectedFlight) {
            setSelectedFlight(flight.id);
            return;
        }

        // avoid selecting the same flight two times on the same pair
        if (selectedFlight === flight.id) {
            return;
        }

        const pair = [selectedFlight, flight.id] as [string, string];

        // ignore the pair if it was already selected
        const alreadySelected = selectedPairs.find(
            (selectedPair) =>
                (selectedPair[0] === pair[0] && selectedPair[1] === pair[1]) ||
                (selectedPair[0] === pair[1] && selectedPair[1] === pair[0])
        );
        if (alreadySelected) {
            return;
        }

        // update user selection pairs and clear current flight selection
        setSelectedPairs([...selectedPairs, pair]);
        setSelectedFlight(null);

        // check if game should continue based on last player selection
        const correct = props.scenario.pcds.some(
            (pcd) =>
                (pcd.firstId === pair[0] && pcd.secondId === pair[1]) ||
                (pcd.firstId === pair[1] && pcd.secondId === pair[0])
        );
        if (!correct) {
            setGameOver(true);
            return;
        }
    };

    return (
        <>
            <GameOver open={isReportOpen} setOpen={setReportOpen} text={report} />
            <Button
                disabled={!isGameOver}
                className="fixed bottom-3 right-16 z-10"
                onClick={() => redirect('/play/random')}>
                {'Next'}
            </Button>
            <ScenarioMap
                style={{ width: '100%', height: '100dvh' }}
                scenario={props.scenario}
                selectFlight={selectFlight}
                selectedFlight={selectedFlight}
                selectedPairs={selectedPairs}
            />
        </>
    );
};

export function formatMs(millis: number): string {
    const minutes = Math.floor(millis / 60000);
    const seconds = (millis % 60000) / 1000;
    return (minutes > 0 ? minutes.toFixed(0) + 'm ' : '') + seconds.toFixed(0) + 's';
}
export { Game };
