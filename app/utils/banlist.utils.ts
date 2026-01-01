/**
 * Утилиты для работы с банами
 */

import type { IBan } from '~/types/banlist.types'

export interface BanStatus {
  /** Статус бана: 'active' | 'removed' | 'permanent' | 'expired' */
  status: 'active' | 'removed' | 'permanent' | 'expired'
  /** Текстовое описание статуса */
  text: string
  /** CSS класс цвета для отображения */
  color: string
  /** Активен ли бан в данный момент */
  isActive: boolean
  /** Причина неактивности (если применимо) */
  reason?: string
}

/**
 * Определяет статус бана
 * @param ban - объект бана
 * @returns объект с информацией о статусе
 */
export function getBanStatus(ban: IBan): BanStatus {
  const activeValue = readBanField(ban.active);

  // Проверяем, снят ли бан вручную (active = 0 И есть removed_by_uuid)
  if (activeValue === 0 && ban.removed_by_uuid) {
    let reason = 'Снят администратором'

    // Проверяем специальные причины снятия
    if (ban.removed_by_name === '#expired') {
      reason = 'Автоматически истёк'
    } else if (
      ban.removed_by_name === '[Console]' ||
      ban.removed_by_name === 'Console' ||
      ban.removed_by_name === 'CONSOLE'
    ) {
      reason = 'Снят консолью'
    }

    return {
      status: 'removed',
      text: `Снят${ban.removed_by_date ? ` ${new Date(ban.removed_by_date).toLocaleDateString('ru-RU')}` : ''}`,
      color: 'text-gray-500',
      isActive: false,
      reason
    }
  }

  // Перманентный бан (until = 0 или until = -1)
  if (ban.until === 0 || ban.until === -1) {
    return {
      status: 'permanent',
      text: 'Перманентный',
      color: 'text-red-500',
      isActive: true
    }
  }

  // Активный бан (until > now)
  const now = Date.now()
  if (ban.until > now) {
    return {
      status: 'active',
      text: 'Активен',
      color: 'text-yellow-500',
      isActive: true
    }
  }

  // Истёкший бан (until <= now и active = 0 но без removed_by_uuid)
  return {
    status: 'expired',
    text: 'Истёк',
    color: 'text-green-500',
    isActive: false
  }
}

/**
 * Форматирует длительность бана
 * @param ban - объект бана
 * @returns строка с длительностью (например "30 дн. 12 ч." или "Перманентно")
 */
export function getBanDuration(ban: IBan): string {
  // Перманентный бан
  if (ban.until === 0 || ban.until === -1) {
    return 'Перманентно'
  }

  const duration = ban.until - ban.time
  const ms = Math.max(0, duration)

  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days} дн. ${hours} ч.`
  if (hours > 0) return `${hours} ч. ${minutes} мин.`
  return `${minutes} мин.`
}

/**
 * Форматирует дату окончания бана с учётом типа (перманентный, истёкший и т.д.)
 * @param ban - объект бана
 * @returns строка для отображения
 */
export function getBanUntilText(ban: IBan, formatTime: (ms: number) => string): string {
  if (ban.until === 0 || ban.until === -1) {
    return 'Никогда'
  }

  return formatTime(ban.until)
}

/**
 * Определяет, может ли пользователь снять этот бан
 * @param ban - объект бана
 * @returns true если бан активен
 */
export function canRemoveBan(ban: IBan): boolean {
  return readBanField(ban.active) === 1
}

/**
 * Определяет, является ли бан IP-баном
 * @param ban - объект бана
 * @returns true если это IP-бан
 */
export function isBanIp(ban: IBan): boolean {
  return readBanField(ban.ipban) === 1
}

/**
 * Определяет, является ли бан скрытым
 * @param ban - объект бана
 * @returns true если бан скрытый
 */
export function isBanSilent(ban: IBan): boolean {
  return readBanField(ban.silent) === 1
}

/**
 * Безопасно читает значение поля, которое может быть number или Buffer
 * @param value - значение которое может быть number или Buffer
 * @returns число (0 или 1)
 */
export function readBanField(value: number | { type: string; data: number[] } | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object' && 'data' in value && Array.isArray(value.data)) {
    return value.data[0] ?? 0;
  }
  return 0;
}
