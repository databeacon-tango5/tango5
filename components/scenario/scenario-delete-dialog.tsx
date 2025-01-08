'use client';

import { PropsWithoutRef, startTransition, useActionState, useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import revalidateCacheTag, { deleteScenario } from '~/lib/actions/scenario';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '~/components/ui/dialog';
import { DialogClose } from '@radix-ui/react-dialog';
import { Trash2Icon } from 'lucide-react';
import { cacheTags } from '~/lib/constants';
import { toast } from 'sonner';

export const ScenarioDeleteDialog = (props: PropsWithoutRef<{ id: number }>) => {
    const [open, setOpen] = useState(false);
    const [state, action, pending] = useActionState(deleteScenario, { message: '', error: false });

    useEffect(() => {
        if (state.message && state.error) toast.error(state.message);
        if (state.message && !state.error) toast.success(state.message);
        revalidateCacheTag(cacheTags.scenarios);
    }, [state]);

    useEffect(() => {
        if (pending) toast.info(`Deleting scenario #${props.id}`);
    }, [pending, props.id]);

    const deleteCurrentScenario = () => {
        startTransition(async () => {
            action(props.id);
            setOpen(false);
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Trash2Icon size={'1rem'} />
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{'Delete scenario'}</DialogTitle>
                    <DialogDescription>
                        {'Are you sure you want to delete the scenario? This action can not be undone. '}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant={'destructive'} disabled={pending} onClick={deleteCurrentScenario}>
                        {pending ? 'Deleting' : 'Delete'}
                    </Button>
                    <DialogClose asChild>
                        <Button variant={'outline'}>{'Cancel'}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
