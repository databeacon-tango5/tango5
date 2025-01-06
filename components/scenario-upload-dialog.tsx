'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import revalidateCacheTag, { createScenario } from '~/lib/actions';
import { toast } from '~/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from '~/components/ui/dialog';
import { FilePlus2 } from 'lucide-react';
import { cacheTags } from '~/lib/constants';

export function ScenarioUploadDialog() {
    const [open, setOpen] = useState(false);
    const [state, formAction, pending] = useActionState(createScenario, { message: '' });
    const [data, setData] = useState('');

    useEffect(() => {
        if (state.message) toast({ description: state.message });
        revalidateCacheTag(cacheTags.scenarios);
    }, [state]);

    useEffect(() => {
        if (!open) setData('');
    }, [open]);

    useEffect(() => {
        if (pending) toast({ description: 'Loading...' });
    }, [pending]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <FilePlus2 size={'1rem'} />
            </DialogTrigger>
            <DialogContent>
                <form className="grid w-full items-center gap-6" action={formAction} onSubmit={() => setOpen(false)}>
                    <DialogHeader>
                        <DialogTitle>{'Scenario Upload'}</DialogTitle>
                        <DialogDescription>{'New scenario from a JSON file'}</DialogDescription>
                    </DialogHeader>

                    <Input type="file" onChange={(e) => e.target.files?.item(0)?.text().then(setData)} />
                    <Input
                        className="hidden"
                        name="data"
                        value={data}
                        onChange={() => {} /* required to be  controlled */}
                    />

                    <DialogFooter>
                        <Button type="submit" disabled={data === '' || pending}>
                            {pending ? 'Loading' : 'Submit'}
                        </Button>
                        <DialogClose asChild>
                            <Button>{'Cancel'}</Button>
                        </DialogClose>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
