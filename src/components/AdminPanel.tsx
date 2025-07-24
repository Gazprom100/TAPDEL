import React, { useEffect, useState } from 'react';
import { GAME_MECHANICS, COMPONENTS } from '../types/game';

interface AdminStats {
  totalUsers: number;
  totalTokens: number;
  totalDeposits: number;
  sumDeposits: number;
  totalWithdrawals: number;
  sumWithdrawals: number;
  activeUsers: number;
}

interface TokenConfig {
  symbol: string;
  contractAddress: string;
  decimals: number;
}

interface GameSettings {
  token: TokenConfig;
  gameMechanics: {
    baseReward: number;
    maxFingers: number;
    rateWindow: number;
  };
  gearMultipliers: Record<string, number>;
  gearThresholds: Record<string, number>;
  energy: {
    recoveryRate: number;
    consumptionRate: Record<string, number>;
  };
  components: {
    engines: number[];
    gearboxes: number[];
    batteries: number[];
    hyperdrives: number[];
    powerGrids: number[];
  };
}

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Локальные копии для редактирования
  const [token, setToken] = useState<TokenConfig>({ symbol: 'DEL', contractAddress: '', decimals: 18 });
  const [baseReward, setBaseReward] = useState(1);
  const [gearMultipliers, setGearMultipliers] = useState<Record<string, number>>({});
  const [gearThresholds, setGearThresholds] = useState<Record<string, number>>({});
  const [energyRecovery, setEnergyRecovery] = useState(0.033);
  const [energyConsumption, setEnergyConsumption] = useState<Record<string, number>>({});
  const [engineCosts, setEngineCosts] = useState<number[]>([]);
  const [gearboxCosts, setGearboxCosts] = useState<number[]>([]);
  const [batteryCosts, setBatteryCosts] = useState<number[]>([]);
  const [hyperdriveCosts, setHyperdriveCosts] = useState<number[]>([]);
  const [powerGridCosts, setPowerGridCosts] = useState<number[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/statistics').then(res => res.json()),
      fetch('/api/admin/settings').then(res => res.json())
    ])
      .then(([statsData, settingsData]) => {
        setStats(statsData);
        setSettings(settingsData);
        
        // Инициализируем локальные копии
        setToken(settingsData.token);
        setBaseReward(settingsData.gameMechanics.baseReward);
        setGearMultipliers(settingsData.gearMultipliers);
        setGearThresholds(settingsData.gearThresholds);
        setEnergyRecovery(settingsData.energy.recoveryRate);
        setEnergyConsumption(settingsData.energy.consumptionRate);
        setEngineCosts(settingsData.components.engines);
        setGearboxCosts(settingsData.components.gearboxes);
        setBatteryCosts(settingsData.components.batteries);
        setHyperdriveCosts(settingsData.components.hyperdrives);
        setPowerGridCosts(settingsData.components.powerGrids);
        
        setLoading(false);
      })
      .catch(e => {
        setError('Ошибка загрузки данных');
        setLoading(false);
      });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = {
        token,
        gameMechanics: {
          baseReward,
          maxFingers: 5,
          rateWindow: 1000
        },
        gearMultipliers,
        gearThresholds,
        energy: {
          recoveryRate: energyRecovery,
          consumptionRate: energyConsumption
        },
        components: {
          engines: engineCosts,
          gearboxes: gearboxCosts,
          batteries: batteryCosts,
          hyperdrives: hyperdriveCosts,
          powerGrids: powerGridCosts
        }
      };

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });

      if (response.ok) {
        setSettings(settingsToSave);
        alert('Настройки сохранены!');
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (e) {
      setError('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cyber-modal" onClick={onClose}>
      <div className="cyber-panel w-[95vw] max-w-4xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="cyber-text text-xl">Админ-панель</h2>
          <button className="cyber-button" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-4">
          <div className="cyber-text text-base">Добро пожаловать в админ-панель! Здесь доступны настройки и статистика игры.</div>
          
          {loading ? (
            <div className="cyber-text">Загрузка данных...</div>
          ) : error ? (
            <div className="cyber-text text-red-500">{error}</div>
          ) : (
            <>
              {/* Статистика */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="cyber-card">
                    <div className="cyber-text text-lg">Пользователей</div>
                    <div className="cyber-text text-2xl font-bold">{stats.totalUsers}</div>
                  </div>
                  <div className="cyber-card">
                    <div className="cyber-text text-lg">Активных за 24ч</div>
                    <div className="cyber-text text-2xl font-bold">{stats.activeUsers}</div>
                  </div>
                  <div className="cyber-card">
                    <div className="cyber-text text-lg">Баланс системы</div>
                    <div className="cyber-text text-2xl font-bold">{stats.totalTokens.toLocaleString()} DEL</div>
                  </div>
                  <div className="cyber-card">
                    <div className="cyber-text text-lg">Депозиты</div>
                    <div className="cyber-text text-2xl font-bold">{stats.totalDeposits} / {stats.sumDeposits.toLocaleString()} DEL</div>
                  </div>
                  <div className="cyber-card">
                    <div className="cyber-text text-lg">Выводы</div>
                    <div className="cyber-text text-2xl font-bold">{stats.totalWithdrawals} / {stats.sumWithdrawals.toLocaleString()} DEL</div>
                  </div>
                </div>
              )}

              {/* Смена токена начисления */}
              <div className="cyber-card mt-4">
                <div className="cyber-text text-lg mb-2">Текущий токен начисления</div>
                <div className="flex flex-col gap-2 mb-2">
                  <div className="cyber-text text-base">Символ: <span className="font-bold">{token.symbol}</span></div>
                  <div className="cyber-text text-base">Контракт: <span className="font-mono">{token.contractAddress || 'Нативный DEL'}</span></div>
                  <div className="cyber-text text-base">Decimals: <span className="font-bold">{token.decimals}</span></div>
                </div>
                <div className="cyber-text text-base mb-2">Изменить токен начисления:</div>
                <div className="flex flex-col gap-2 mb-2">
                  <input className="cyber-input" placeholder="Символ (например, TRUMPIO)" value={token.symbol} onChange={e => setToken({ ...token, symbol: e.target.value })} />
                  <input className="cyber-input" placeholder="Адрес контракта (0x...) или пусто для DEL" value={token.contractAddress} onChange={e => setToken({ ...token, contractAddress: e.target.value })} />
                  <input className="cyber-input" placeholder="Decimals (обычно 18)" type="number" value={token.decimals} onChange={e => setToken({ ...token, decimals: Number(e.target.value) })} />
                </div>
              </div>

              {/* Экономика игры */}
              <div className="cyber-card mt-4">
                <div className="cyber-text text-lg mb-2">Параметры экономики игры</div>
                <div className="flex flex-col gap-2 mb-2">
                  <label className="cyber-text text-base">Базовая награда за тап:
                    <input className="cyber-input ml-2 w-24" type="number" value={baseReward} onChange={e => setBaseReward(Number(e.target.value))} />
                  </label>
                  <div className="cyber-text text-base mt-2">Множители передач:</div>
                  {Object.entries(gearMultipliers).map(([gear, mult]) => (
                    <label key={gear} className="cyber-text text-sm ml-2">{gear}:
                      <input className="cyber-input ml-2 w-20" type="number" value={mult} step="0.01" onChange={e => setGearMultipliers({ ...gearMultipliers, [gear]: Number(e.target.value) })} />
                    </label>
                  ))}
                  <div className="cyber-text text-base mt-2">Пороги передач (тапов/сек):</div>
                  {Object.entries(gearThresholds).map(([gear, thr]) => (
                    <label key={gear} className="cyber-text text-sm ml-2">{gear}:
                      <input className="cyber-input ml-2 w-20" type="number" value={thr} onChange={e => setGearThresholds({ ...gearThresholds, [gear]: Number(e.target.value) })} />
                    </label>
                  ))}
                  <label className="cyber-text text-base mt-2">Скорость восстановления энергии:
                    <input className="cyber-input ml-2 w-24" type="number" value={energyRecovery} step="0.001" onChange={e => setEnergyRecovery(Number(e.target.value))} />
                  </label>
                  <div className="cyber-text text-base mt-2">Расход энергии (% за тап):</div>
                  {Object.entries(energyConsumption).map(([gear, val]) => (
                    <label key={gear} className="cyber-text text-sm ml-2">{gear}:
                      <input className="cyber-input ml-2 w-20" type="number" value={val} step="0.0001" onChange={e => setEnergyConsumption({ ...energyConsumption, [gear]: Number(e.target.value) })} />
                    </label>
                  ))}
                  <div className="cyber-text text-base mt-2">Стоимость апгрейдов (DEL):</div>
                  <div className="cyber-text text-sm ml-2">Двигатели:</div>
                  {engineCosts.map((cost, i) => (
                    <input key={i} className="cyber-input ml-2 w-24 mb-1" type="number" value={cost} onChange={e => { const arr = [...engineCosts]; arr[i] = Number(e.target.value); setEngineCosts(arr); }} />
                  ))}
                  <div className="cyber-text text-sm ml-2">КПП:</div>
                  {gearboxCosts.map((cost, i) => (
                    <input key={i} className="cyber-input ml-2 w-24 mb-1" type="number" value={cost} onChange={e => { const arr = [...gearboxCosts]; arr[i] = Number(e.target.value); setGearboxCosts(arr); }} />
                  ))}
                  <div className="cyber-text text-sm ml-2">Батареи:</div>
                  {batteryCosts.map((cost, i) => (
                    <input key={i} className="cyber-input ml-2 w-24 mb-1" type="number" value={cost} onChange={e => { const arr = [...batteryCosts]; arr[i] = Number(e.target.value); setBatteryCosts(arr); }} />
                  ))}
                  <div className="cyber-text text-sm ml-2">Гипердвигатели:</div>
                  {hyperdriveCosts.map((cost, i) => (
                    <input key={i} className="cyber-input ml-2 w-24 mb-1" type="number" value={cost} onChange={e => { const arr = [...hyperdriveCosts]; arr[i] = Number(e.target.value); setHyperdriveCosts(arr); }} />
                  ))}
                  <div className="cyber-text text-sm ml-2">Энергосети:</div>
                  {powerGridCosts.map((cost, i) => (
                    <input key={i} className="cyber-input ml-2 w-24 mb-1" type="number" value={cost} onChange={e => { const arr = [...powerGridCosts]; arr[i] = Number(e.target.value); setPowerGridCosts(arr); }} />
                  ))}
                </div>
                <button className="cyber-button mt-2" onClick={saveSettings} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить настройки'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 