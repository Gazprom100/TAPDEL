import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface TokenCounterProps {
  tokens: number
}

export const TokenCounter = ({ tokens }: TokenCounterProps) => {
  const counterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log('TokenCounter update:', {
      tokens,
      formattedValue: tokens.toLocaleString()
    });
    
    if (counterRef.current) {
      gsap.from(counterRef.current, {
        scale: 1.2,
        duration: 0.2,
        ease: "power2.out"
      })
    }
  }, [tokens])

  return (
    <div 
      ref={counterRef}
      className="
        bg-black/50 
        backdrop-blur-sm 
        border-2 border-green-400 
        rounded-lg 
        px-6 py-3 
        mb-8
        shadow-[0_0_15px_rgba(0,255,136,0.3)]
      "
    >
      <div className="text-sm text-green-400 mb-1">BOOST</div>
      <div className="text-4xl font-mono text-neon-green">
        {tokens.toLocaleString()}
      </div>
    </div>
  )
} 