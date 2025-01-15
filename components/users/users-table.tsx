'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { PropsWithoutRef } from 'react';
import { UserWipeProgressDialog } from '../user/user-wipe-progress-dialog';

export const columns: ColumnDef<{ id: string }>[] = [
    {
        accessorKey: 'id',
        header: () => <div className="text-center">id</div>
    },
    {
        accessorKey: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
            const id = row.getValue('id') as string;

            return <UserWipeProgressDialog id={id} />;
        }
    }
];

export const UsersTable = (props: PropsWithoutRef<{ users: { id: string }[] }>) => {
    return <DataTable data={props.users} columns={columns} initialState={{ columnVisibility: { data: false } }} />;
};
