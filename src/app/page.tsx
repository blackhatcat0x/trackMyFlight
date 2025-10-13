'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const handleGetStarted = () => {
    // Navigate to search page
    router.push('/search')
  }

  const handleLearnMore = () => {
    router.push('/learn-more')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-8 p-4">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mb-6 relative flex justify-center">
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <Image
                      src="/img/page-logo.png"
                      alt="TrackMyFlight Logo"
                      width={200}
                      height={121}
                      className="object-contain h-full"
                    />
          </div>
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-2xl hidden">
            TrackMyFlight
          </h1>
          <p className="text-xl text-blue-100 text-center max-w-2xl drop-shadow-lg">
            Real-time flight tracking application for the web
          </p>
        </div>
        
        {/* Features Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20">
          <h2 className="text-2xl font-bold mb-6 text-white">Features</h2>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all">
              <span className="text-2xl text-green-400">✓</span>
              <span className="text-white font-medium">Real-time flight tracking</span>
            </li>
            <li className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all">
              <span className="text-2xl text-blue-400">✓</span>
              <span className="text-white font-medium">Interactive maps</span>
            </li>
            <li className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all">
              <span className="text-2xl text-purple-400">✓</span>
              <span className="text-white font-medium">Flight search</span>
            </li>
            <li className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all">
              <span className="text-2xl text-orange-400">✓</span>
              <span className="text-white font-medium">Push notifications</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
          >
            Get Started
          </button>
          <button 
            onClick={handleLearnMore}
            className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl border border-white/20"
          >
            Learn More
          </button>
        </div>

      </div>
    </div>
  )
}
