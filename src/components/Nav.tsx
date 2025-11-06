'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
const tabs=[{href:'/',label:'Home'},{href:'/standings',label:'Standings'},{href:'/matchups',label:'Matchups'},{href:'/dashboard',label:'Dashboard'}]
export default function Nav(){const p=usePathname();const{isSignedIn}=useUser();return(<nav className='sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5'><div className='container flex items-center justify-between h-12'><Link href='/' className='font-bold'>Puck‑Picks</Link><div className='flex items-center gap-4'>{tabs.map(t=>(<Link key={t.href} href={t.href} className={`text-sm ${p===t.href?'font-semibold underline':''}`}>{t.label}</Link>))}{isSignedIn?<UserButton afterSignOutUrl='/'/>:<Link href='/sign-in' className='text-sm font-medium underline'>Sign in</Link>}</div></div></nav>)}
