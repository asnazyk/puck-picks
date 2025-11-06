import {SignIn} from '@clerk/nextjs'
export default function P(){return(<main className='main section'><div className='card p-6'><SignIn routing='path' path='/sign-in'/></div></main>)}