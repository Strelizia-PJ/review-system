import { describe, it, expect } from 'vitest'
import { createEmptyCard } from 'ts-fsrs'
import {
  previewInterval,
  getRetrievability,
  DEFAULT_MAX_REVIEW_INTERVAL_DAYS,
  ABSOLUTE_MAX_INTERVAL_DAYS,
  QUALITY_LABELS,
  QUALITY_COLORS,
  WEEKDAY_ORDER
} from '../src/constants'

const freshCard = JSON.stringify(createEmptyCard())

describe('常量', () => {
  it('导出默认与绝对间隔上限', () => {
    expect(DEFAULT_MAX_REVIEW_INTERVAL_DAYS).toBe(28)
    expect(ABSOLUTE_MAX_INTERVAL_DAYS).toBe(365)
  })

  it('评分四色与标签覆盖 1-4 档', () => {
    expect(Object.keys(QUALITY_LABELS).sort()).toEqual(['1', '2', '3', '4'])
    expect(Object.keys(QUALITY_COLORS).sort()).toEqual(['1', '2', '3', '4'])
  })

  it('周序从周一开始且包含七天', () => {
    expect(WEEKDAY_ORDER).toHaveLength(7)
    expect(WEEKDAY_ORDER[0]).toBe(1)
    expect(WEEKDAY_ORDER[6]).toBe(0)
  })
})

describe('previewInterval', () => {
  it('无卡片状态时返回 1 天', () => {
    expect(previewInterval(null, 3)).toBe(1)
    expect(previewInterval(undefined, 1)).toBe(1)
  })

  it('非法卡片状态（损坏 JSON）时安全回退为 1', () => {
    expect(previewInterval('{broken json', 3)).toBe(1)
  })

  it('新卡各评分返回正整数天数', () => {
    for (const q of [1, 2, 3, 4]) {
      const days = previewInterval(freshCard, q)
      expect(days).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(days)).toBe(true)
    }
  })

  it('结果不超过传入的有效上限', () => {
    for (const cap of [1, 3, 28]) {
      for (const q of [1, 2, 3, 4]) {
        expect(previewInterval(freshCard, q, cap)).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('默认不超过全局默认上限', () => {
    for (const q of [1, 2, 3, 4]) {
      expect(previewInterval(freshCard, q)).toBeLessThanOrEqual(DEFAULT_MAX_REVIEW_INTERVAL_DAYS)
    }
  })
})

describe('getRetrievability', () => {
  it('无卡片状态返回 null', () => {
    expect(getRetrievability(null)).toBeNull()
    expect(getRetrievability(undefined)).toBeNull()
  })

  it('损坏 JSON 安全返回 null', () => {
    expect(getRetrievability('not-json')).toBeNull()
  })

  it('新卡（未复习）保留率为 0', () => {
    expect(getRetrievability(freshCard)).toBe(0)
  })

  it('已复习卡片当天保留率在 0.9-1 之间', () => {
    const card = {
      ...createEmptyCard(),
      state: 2, // Review
      reps: 3,
      stability: 10,
      difficulty: 5,
      last_review: new Date()
    }
    const r = getRetrievability(JSON.stringify(card))
    expect(r).not.toBeNull()
    expect(r!).toBeGreaterThan(0.9)
    expect(r!).toBeLessThanOrEqual(1)
  })
})
