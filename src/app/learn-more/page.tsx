'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LearnMore() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const handleGetStarted = () => {
    router.push('/search')
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  const features = [
    { icon: '✓', color: 'text-green-400', title: 'Real-time tracking', description: 'Live flight positions updated every second' },
    { icon: '✓', color: 'text-blue-400', title: 'Interactive maps', description: 'Beautiful, responsive map interface' },
    { icon: '✓', color: 'text-purple-400', title: 'Instant search', description: 'Find any flight in seconds' },
    { icon: '✓', color: 'text-orange-400', title: 'Live estimates', description: 'Accurate arrival time predictions' }
  ]

  const useCases = [
    {
      icon: '👥',
      title: 'Meeting someone',
      description: 'Know exactly when to arrive at the airport'
    },
    {
      icon: '✈️',
      title: 'Checking your flight',
      description: 'Monitor your own flight before heading out'
    },
    {
      icon: '🔍',
      title: 'Just curious',
      description: 'Find out where that plane overhead is going'
    }
  ]

  const comingSoon = [
    { icon: '🔔', title: 'Push notifications', description: 'Get alerts for departures and arrivals' },
    { icon: '📱', title: 'Mobile apps', description: 'Lightweight apps for iOS & Android' },
    { icon: '🌍', title: 'Multi-language support', description: 'For travelers around the world' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 left-1/4 w-60 h-60 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      {/* Navigation */}
      <div className="relative z-10 sticky top-0 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Image
              src="/img/page-logo.png"
              alt="TrackMyFlight Logo"
              width={40}
              height={24}
              className="object-contain"
            />
            <span className="text-white font-bold text-xl">TrackMyFlight</span>
          </div>

          <button 
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-2 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl">
            Learn More About TrackMyFlight
          </h1>
          <p className="text-2xl md:text-3xl text-blue-200 font-light mb-8">
            A Simpler Way to Track Flights
          </p>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <p className="text-lg text-blue-100 leading-relaxed">
              Most flight tracking apps are packed with ads, cluttered maps, and confusing menus. 
              We built TrackMyFlight to do just one thing — and do it perfectly: 
              show you a live flight, in real time, without the fuss.
            </p>
          </div>
        </div>

        {/* What You Get Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Search any commercial flight number and instantly see:
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group"
                onMouseEnter={() => setActiveSection(`feature-${index}`)}
                onMouseLeave={() => setActiveSection(null)}
              >
                <div className="flex items-start gap-4">
                  <span className={`text-3xl ${feature.color} group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-blue-100">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Values */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-8 mb-16 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            No sign-ups. No pop-ups. No spam.
          </h2>
          <p className="text-xl text-blue-100 text-center font-medium">
            Just the flight you care about — clear, fast, and accurate.
          </p>
        </div>

        {/* Why We Built This */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Why We Built TrackMyFlight
          </h2>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <p className="text-lg text-blue-100 leading-relaxed mb-6">
              After trying every major flight tracking app, we realised most people don't want to scroll through a sky full of icons.
              They just want to know where one flight is right now — simply and reliably.
            </p>
            
            <p className="text-lg text-blue-100 leading-relaxed">
              That's why we designed TrackMyFlight to load instantly, work anywhere, and focus only on what matters:
              your flight, moving live on the map.
            </p>
          </div>
        </div>

        {/* Our Mission */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Our Mission
          </h2>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-8">
            <p className="text-lg text-blue-100 leading-relaxed mb-6">
              We believe flight tracking should be accessible, accurate, and frustration-free.
              Whether you're:
            </p>
            
            <div className="space-y-4">
              {useCases.map((useCase, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                >
                  <span className="text-3xl">{useCase.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {useCase.title}
                    </h3>
                    <p className="text-blue-100">
                      {useCase.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <p className="text-lg text-blue-100 leading-relaxed">
              TrackMyFlight gives you instant answers, with no hoops to jump through.
            </p>
            
            <p className="text-lg text-white font-semibold mt-4 mb-2">
              We respect your time, your privacy, and your data.
            </p>
            
            <p className="text-lg text-blue-100">
              That's why we built an experience that's ad-free, account-free, and distraction-free.
            </p>
          </div>
        </div>

        {/* Keeping It Free */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Keeping It Free
          </h2>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <p className="text-lg text-blue-100 leading-relaxed mb-6">
              We don't sell user data or clutter the screen with ads.
              Instead, TrackMyFlight runs on community support.
            </p>
            
            <p className="text-lg text-blue-100 leading-relaxed mb-8">
              If you like what we're building, you can:
            </p>
            
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center mb-6">
              <p className="text-2xl mb-4">
                ☕ Buy us a coffee or 🍺 a beer to help keep the servers running.
              </p>
              <p className="text-lg text-blue-100">
                Every contribution helps us maintain fast, reliable tracking for everyone.
              </p>
            </div>
          </div>
        </div>

        {/* Crypto Donations */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Support with Crypto
          </h2>
          
          <div className="bg-gradient-to-r from-orange-600/20 to-yellow-600/20 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <p className="text-lg text-blue-100 leading-relaxed mb-8 text-center">
              Prefer to support us with cryptocurrency? We accept donations in all major tokens except Bitcoin.
            </p>
            
            <div className="bg-white/5 rounded-xl p-8 border border-white/10">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="text-3xl">🪙</span>
                  <h3 className="text-2xl font-bold text-white">Crypto Wallet</h3>
                </div>
                <p className="text-sm text-blue-200 mb-4">Supported: BNB, ETH, SOL, and most other tokens</p>
              </div>
              
              <div className="bg-black/30 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-blue-200 font-medium">Wallet Address:</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText('0xb1318A5f2535530CB6eF09860BFf2EFE3CFBFB29')}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="font-mono text-white text-lg break-all select-all bg-black/20 p-4 rounded border border-white/10">
                  0xb1318A5f2535530CB6eF09860BFf2EFE3CFBFB29
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-blue-200 mb-3">
                  Your crypto donation helps us:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="text-2xl mb-2 block">🚀</span>
                    <p className="text-sm text-blue-100">Maintain fast servers</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="text-2xl mb-2 block">🛡️</span>
                    <p className="text-sm text-blue-100">Keep the service ad-free</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <span className="text-2xl mb-2 block">🌟</span>
                    <p className="text-sm text-blue-100">Add new features</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-blue-300">
                  ⚠️ Please double-check the wallet address before sending any crypto. 
                  We are not responsible for funds sent to incorrect addresses.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Coming Soon
          </h2>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <p className="text-lg text-blue-100 leading-relaxed mb-8">
              We're currently developing a few optional extras, including:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comingSoon.map((item, index) => (
                <div 
                  key={index}
                  className="bg-white/5 rounded-xl p-6 border border-white/10 text-center hover:bg-white/10 transition-all"
                >
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-blue-100 text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-lg text-blue-100">
                But don't worry — TrackMyFlight will always stay simple, fast, and free of clutter.
              </p>
            </div>
          </div>
        </div>

        {/* Say Thanks */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Say Thanks
          </h2>
          
          <div className="bg-gradient-to-r from-pink-600/20 to-red-600/20 backdrop-blur-md rounded-2xl p-8 border border-white/10 text-center">
            <p className="text-lg text-blue-100 leading-relaxed mb-6">
              If you've found TrackMyFlight useful, hit the ❤️ Say Thanks button or leave a short note.
              Your feedback keeps us motivated and helps shape future updates.
            </p>
            
            <p className="text-lg text-white leading-relaxed">
              Together, we can make flight tracking simpler, faster, and friendlier for everyone.
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-4xl font-bold text-white mb-4">
              TrackMyFlight — Real-time flight tracking made simple.
            </h2>
            <p className="text-2xl text-blue-200 font-light italic mb-8">
              Because sometimes, less really is more.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                Try It Now
              </button>
              <button 
                onClick={handleBackToHome}
                className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl border border-white/20"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
