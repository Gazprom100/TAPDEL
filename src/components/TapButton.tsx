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
        relative
        w-48 h-48 
        rounded-full 
        bg-gradient-to-br 
        from-green-400/20 
        to-green-600/40
        backdrop-blur-sm
        border-2 
        border-neon-green
        shadow-neon
        transition-all 
        duration-200
        flex 
        items-center 
        justify-center
        text-neon-green 
        text-2xl 
        font-bold
        overflow-hidden
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:shadow-neon-strong hover:scale-105 active:scale-95'
        }
      `}
    >
      {/* Внутренний светящийся эффект */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-green-600/20 animate-pulse-neon" />
      
      {/* Текст */}
      <span className="relative z-10 animate-pulse-neon">TAP</span>
    </button>
  )
} 