import type {Metadata} from 'next';
import './globals.css';
import './stadium.css';
import {MatchProvider} from '@/components/match-provider';
import {Shell} from '@/components/shell';
export const metadata:Metadata={title:'Boundary · School Cricket Live',description:'Every run. Every wicket. Together. Follow your school cricket match live.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body suppressHydrationWarning><MatchProvider><Shell>{children}</Shell></MatchProvider></body></html>;}
