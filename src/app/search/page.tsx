'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'flight' | 'route' | 'airport'>('flight')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // For now, just show an alert. In a real app, this would search flights
      alert(`Searching for ${searchType}: ${searchQuery}`)
    }
  }

  const handleBack = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBack}
                className="text-white hover:text-blue-300 transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <Image 
                  src="/img/logo.png" 
                  alt="TrackMyFlight Logo" 
                  width={40} 
                  height={40}
                  className="rounded-full border-2 border-white/20"
                />
                <h1 className="text-2xl font-bold text-white">Flight Search</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="mb-4 relative">
                  <div className="absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-20 animate-pulse mx-auto w-16 h-16"></div>
                  <div className="relative z-10 text-4xl">✈️</div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Search Flights</h2>
                <p className="text-blue-200">Find any flight in real-time</p>
              </div>
              
              {/* Search Type Selector */}
              <div className="flex gap-2 mb-6 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
                <button
                  onClick={() => setSearchType('flight')}
                  className={`flex-1 py-3 px-4 rounded-md transition-all transform hover:scale-105 ${
                    searchType === 'flight' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-medium">Flight Number</span>
                  <span className="block text-xs opacity-75">AA123</span>
                </button>
                <button
                  onClick={() => setSearchType('route')}
                  className={`flex-1 py-3 px-4 rounded-md transition-all transform hover:scale-105 ${
                    searchType === 'route' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-medium">Route</span>
                  <span className="block text-xs opacity-75">JFK-LAX</span>
                </button>
                <button
                  onClick={() => setSearchType('airport')}
                  className={`flex-1 py-3 px-4 rounded-md transition-all transform hover:scale-105 ${
                    searchType === 'airport' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="block text-sm font-medium">Airport</span>
                  <span className="block text-xs opacity-75">JFK</span>
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-blue-300 group-hover:text-blue-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchType === 'flight' ? 'Enter flight number (e.g., AA123)' :
                      searchType === 'route' ? 'Enter route (e.g., JFK-LAX)' :
                      'Enter airport code (e.g., JFK)'
                    }
                    className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300 hover:text-white transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
                >
                  Search Flights
                </button>
              </form>

              {/* Popular Searches */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  Popular Searches
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { term: 'AA123', desc: 'New York to LA' },
                    { term: 'UA456', desc: 'Chicago to Miami' },
                    { term: 'DL789', desc: 'Atlanta to Seattle' },
                    { term: 'JFK-LAX', desc: 'Popular Route' },
                    { term: 'LHR-JFK', desc: 'London to NYC' },
                    { term: 'SFO-BOS', desc: 'San Francisco to Boston' }
                  ].map((item) => (
                    <button
                      key={item.term}
                      onClick={() => setSearchQuery(item.term)}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-blue-200 hover:text-white py-3 px-4 rounded-xl text-sm transition-all transform hover:scale-105 border border-white/20 hover:border-white/30 text-left"
                    >
                      <div className="font-medium text-white">{item.term}</div>
                      <div className="text-xs opacity-75">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-sm font-medium text-white">Real-time</div>
                    <div className="text-xs text-blue-200">Live updates</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-2xl mb-1">🌍</div>
                    <div className="text-sm font-medium text-white">Global</div>
                    <div className="text-xs text-blue-200">Worldwide coverage</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-2xl mb-1">📱</div>
                    <div className="text-sm font-medium text-white">Mobile</div>
                    <div className="text-xs text-blue-200">Any device</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
