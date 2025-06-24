import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface EnergyIndicatorProps {
  energy: number
  maxEnergy?: number
}

export const EnergyIndicator = ({ energy, maxEnergy = 100 }: EnergyIndicatorProps) => {
  const circleRef = useRef<SVGCircleElement>(null)
  const percentage = (energy / maxEnergy) * 100
  const circumference = 2 * Math.PI * 70 // radius is 70

  useEffect(() => {
    if (circleRef.current) {
      gsap.to(circleRef.current, {
        strokeDashoffset: circumference - (percentage / 100) * circumference,
        duration: 0.5,
        ease: "power2.out"
      })
    }
  }, [energy, circumference, percentage])

  return (
    <div className="relative w-64 h-64">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="70"
          stroke="#1a472a"
          strokeWidth="8"
          fill="none"
          className="opacity-25"
        />
        <circle
          ref={circleRef}
          cx="50%"
          cy="50%"
          r="70"
          stroke="#00ff88"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference,
          }}
          className="transition-all duration-200"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-bold text-neon-green">
          {Math.round(energy)}
        </span>
      </div>
    </div>
  )
} 