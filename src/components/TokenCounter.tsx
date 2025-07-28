import React, { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import gsap from 'gsap'

interface TokenCounterProps {
  tokens: number
}

export const TokenCounter = ({ tokens }: TokenCounterProps) => {
  const counterRef = useRef<HTMLDivElement>(null)
  const { activeTokenSymbol, refreshActiveToken } = useGameStore()

  useEffect(() => {
    // Загружаем активный токен при монтировании компонента
    const loadActiveToken = async () => {
      try {
        await refreshActiveToken()
      } catch (error) {
        console.error('Ошибка загрузки активного токена:', error)
      }
    }

    loadActiveToken()
    
    // Периодическое обновление активного токена каждые 30 секунд
    const tokenUpdateInterval = setInterval(() => {
      refreshActiveToken()
    }, 30000)
    
    // Очистка интервала при размонтировании
    return () => {
      clearInterval(tokenUpdateInterval)
    }
  }, [refreshActiveToken])

  useEffect(() => {
    console.log('TokenCounter update:', {
      tokens,
      formattedValue: tokens.toLocaleString(),
      tokenSymbol: activeTokenSymbol
    });
    
    if (counterRef.current) {
      gsap.from(counterRef.current, {
        scale: 1.2,
        duration: 0.2,
        ease: "power2.out"
      })
    }
  }, [tokens, activeTokenSymbol])

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
      <div className="text-sm text-green-400 mb-1">{activeTokenSymbol || '...'}</div>
      <div className="text-4xl font-mono text-neon-green">
        {tokens.toLocaleString()}
      </div>
    </div>
  )
} 