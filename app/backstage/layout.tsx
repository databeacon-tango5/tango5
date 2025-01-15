import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger
} from '~/components/ui/sidebar';
import { PropsWithChildren } from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '~/components/ui/sidebar';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { Database, Dices, ThumbsUp, Users, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { ThemeSetting } from '../../components/theme/theme-setting';

export default function DashBoardLayout({ children }: PropsWithChildren) {
    return (
        <SidebarProvider>
            <Sidebar variant="inset">
                <SidebarHeader className="m-2">
                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>{'Play'}</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip={'scenarios'}>
                                    <Link href={'/play/random'}>
                                        <Dices />
                                        <span>{'Random'}</span>
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuButton asChild tooltip={'scenarios'}>
                                    <Link href={'/play/random'}>
                                        <ThumbsUp />
                                        <span>{'Popular'}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                    <SignedIn>
                        <SidebarGroup>
                            <SidebarGroupLabel>{'Admin'}</SidebarGroupLabel>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild tooltip={'scenarios'}>
                                        <Link href={'/backstage/scenarios'}>
                                            <Database />
                                            <span>{'Scenarios'}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild tooltip={'users'}>
                                        <Link href={'/backstage/users'}>
                                            <Users />
                                            <span>{'Users'}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild tooltip={'games'}>
                                        <Link href={'/backstage/games'}>
                                            <Gamepad2 />
                                            <span>{'Games'}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    </SignedIn>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarGroup>
                        <SidebarGroupLabel>{'Settings'}</SidebarGroupLabel>
                        <ThemeSetting />
                    </SidebarGroup>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
