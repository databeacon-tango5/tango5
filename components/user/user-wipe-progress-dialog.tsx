'use client';

import { PropsWithoutRef, startTransition, useActionState, useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { resetUserProgress } from '~/lib/actions';
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
import { HistoryIcon } from 'lucide-react';
import { toast } from 'sonner';

export const UserWipeProgressDialog = (props: PropsWithoutRef<{ id: string }>) => {
    const [open, setOpen] = useState(false);
    const [state, action, pending] = useActionState(resetUserProgress, { message: '', error: false });

    useEffect(() => {
        if (state.message && state.error) toast.error(state.message);
        if (state.message && !state.error) toast.success(state.message);
    }, [state]);

    useEffect(() => {
        if (pending) toast.info(`Wiping progress of user #${props.id}`);
    }, [pending, props.id]);

    const handleReset = () => {
        startTransition(async () => {
            action(props.id);
            setOpen(false);
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <HistoryIcon size={'1rem'} />
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{'Reset user'}</DialogTitle>
                    <DialogDescription>
                        {`Are you sure you want to reset the user's progress? This action cannot be undone.`}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant={'destructive'} disabled={pending} onClick={handleReset}>
                        {pending ? 'Resetting' : 'Reset'}
                    </Button>
                    <DialogClose asChild>
                        <Button variant={'outline'}>{'Cancel'}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
