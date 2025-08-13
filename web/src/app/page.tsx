'use client'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="bg-gradient-to-br from-indigo-50 via-white to-indigo-100 min-h-screen">
      <Nav />
      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg" // Replace with your logo path
              alt="LensWeave Logo"
              width={50}
              height={50}
              className="rounded-lg shadow"
            />
            <span className="text-2xl font-bold tracking-tight text-indigo-700">
              LensWeave
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Collaborative Photography, <span className="text-indigo-600">On-Chain</span>
          </h1>

          <p className="text-gray-700 text-lg leading-relaxed">
            Team up with friends to blend your photos into one AI-composed artwork. 
            Register IP on Origin, store media on IPFS, and mint a jointly-owned NFT on 
            Camp’s Basecamp testnet.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/session"
              className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium shadow hover:bg-indigo-700 transition"
            >
              Start a Session
            </Link>
            <Link
              href="/gallery"
              className="px-6 py-3 rounded-lg bg-white border border-gray-300 font-medium shadow hover:bg-gray-50 transition"
            >
              View Gallery
            </Link>
          </div>
        </div>

        {/* Right Content */}
        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/hero-sample.jpg" // Replace with your hero image path
            alt="Sample Artwork"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      </section>
    </main>
  )
}
