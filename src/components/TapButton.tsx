import { useRef, useEffect } from 'react'
import gsap from 'gsap'

interface TapButtonProps {
  onTap: () => void
  disabled: boolean
}

export const TapButton = ({ onTap, disabled }: TapButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleTap = () => {
    if (!disabled && buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      })
      onTap()
    }
  }

  useEffect(() => {
    if (buttonRef.current) {
      gsap.set(buttonRef.current, { scale: 1 })
    }
  }, [])

  return (
    <button
      ref={buttonRef}
      onClick={handleTap}
      disabled={disabled}
      className={`
        w-48 h-48 rounded-full 
        bg-gradient-to-br from-green-400 to-green-600
        shadow-[0_0_20px_rgba(0,255,136,0.5)]
        transition-all duration-200
        flex items-center justify-center
        text-white text-2xl font-bold
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_30px_rgba(0,255,136,0.7)]'}
      `}
    >
      TAP
    </button>
  )
} 