'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sword, Sparkles, Globe, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI MMO RPG
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Create infinite AI-generated worlds and explore them through natural language. 
              Battle monsters, complete quests, and trade items in this revolutionary text-based MMO.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
                Start Your Adventure
              </Link>
              <Link href="/auth/login" className="btn-secondary text-lg px-8 py-3">
                Continue Journey
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Revolutionary Features</h2>
            <p className="text-xl text-slate-300">
              Experience the future of text-based gaming
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="AI-Generated Worlds"
              description="Create unique fantasy realms with just a prompt. Every world is different, with custom quests, items, and NPCs."
            />
            <FeatureCard
              icon={<Sword className="w-8 h-8" />}
              title="Natural Language"
              description="Play using everyday language. 'Climb the tower with my rope' - the AI understands your intent."
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8" />}
              title="Cross-World Trading"
              description="Items can be traded between worlds. Build a collection that spans multiple realities."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Fair & Balanced"
              description="Server-authoritative gameplay ensures no cheating. Deterministic rules make outcomes predictable."
            />
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">See It In Action</h2>
            <p className="text-xl text-slate-300">
              Watch how natural language commands work in the game
            </p>
          </div>
          
          <div className="card p-6">
            <div className="game-log mb-4">
              <div className="text-green-400 mb-2">
                &gt; You are standing in the Whispering Woods. Ancient trees tower above you, their leaves rustling with an otherworldly melody. A path winds north toward a distant castle, while mysterious glowing mushrooms mark a trail east into deeper woods.
              </div>
              <div className="text-blue-400 mb-2">
                Player: examine the glowing mushrooms
              </div>
              <div className="text-green-400 mb-2">
                &gt; The mushrooms pulse with a soft blue light, casting dancing shadows on the forest floor. They appear to be Lumina Caps - a rare magical ingredient used in potion brewing. You notice they grow in a deliberate pattern, almost like a trail.
              </div>
              <div className="text-blue-400 mb-2">
                Player: follow the mushroom trail carefully while staying alert for danger
              </div>
              <div className="text-green-400">
                &gt; You move cautiously along the glowing trail, your senses heightened. The mushrooms lead you to a hidden grove where a crystal-clear spring bubbles up from the earth. As you approach, you notice fresh wolf tracks in the soft mud...
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Natural language commands are interpreted by AI and converted to game actions
              </div>
              <Link href="/auth/register" className="btn-primary">
                Try It Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-4">Ready to Begin?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of adventurers exploring infinite AI-generated worlds
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
              Create Free Account
            </Link>
            <Link href="/demo" className="btn-secondary text-lg px-8 py-3">
              Try Demo
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-4">
            No credit card required • Play instantly • Open source
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <p>&copy; 2024 AI MMO RPG. Open source text-based adventure game.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 text-center">
      <div className="text-blue-400 mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-slate-300">{description}</p>
    </div>
  );
}
