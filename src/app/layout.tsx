import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import Nav from '@/components/Nav'
export const metadata: Metadata = { title:'Puck-Picks', description:'Fantasy hockey (Thu–Sun weeks)' }
export default function RootLayout({ children }:{ children:React.ReactNode }){return(<ClerkProvider><html lang='en'><body><Nav/>{children}</body></html></ClerkProvider>)}
