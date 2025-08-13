'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const Connect = dynamic(() => import('@/components/Connect'), { ssr: false })

export default function Nav() {
  return (
    <nav className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">LensWeave</Link>
        <Link href="/session" className="text-sm text-gray-600 hover:text-black">New Session</Link>
        <Link href="/gallery" className="text-sm text-gray-600 hover:text-black">Gallery</Link>
        <div className="ml-auto">
          <Connect />
        </div>
      </div>
    </nav>
  )
}
