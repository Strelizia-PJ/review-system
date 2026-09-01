import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-categories-test-'))
const dbPath = path.join(tmpRoot, 'data.json')

vi.mock('electron', () => ({
  app: {
    getPath: () => tmpRoot
  }
}))

function seedV14Data(): void {
  fs.writeFileSync(
    dbPath,
    JSON.stringify({
      schema_version: 14,
      knowledge_points: [],
      review_records: [],
      daily_plans: [],
      daily_plan_completions: [],
      study_sessions: [],
      mistake_points: [
        {
          id: 1,
          content: '存量易错点',
          count: 2,
          created_at: '2026-08-01 10:00:00',
          updated_at: '2026-08-01 10:00:00'
        }
      ],
      mistake_types: [
        {
          id: 1,
          content: '概念不清',
          count: 1,
          created_at: '2026-08-01 10:00:00',
          updated_at: '2026-08-01 10:00:00'
        }
      ],
      settings: {}
    }),
    'utf-8'
  )
}

/** 每个用例独立模块实例,避免 connection 的模块级缓存串档。 */
async function freshModules() {
  vi.resetModules()
  const migrations = await import('../electron/database/migrations')
  const queries = await import('../electron/database/queries')
  return { migrations, queries }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readDb = (): any => JSON.parse(fs.readFileSync(dbPath, 'utf-8'))

beforeEach(() => {
  for (const suffix of ['', '.bak', '.tmp']) {
    const p = dbPath + suffix
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }
  seedV14Data()
})

describe('schema v15 迁移', () => {
  it('补 categories 集合并为两类词条补 category_id', async () => {
    const { migrations } = await freshModules()
    migrations.runMigrations()
    const db = readDb()
    expect(db.schema_version).toBe(15)
    expect(db.categories).toEqual([])
    expect(db.mistake_points[0].category_id).toBeNull()
    expect(db.mistake_types[0].category_id).toBeNull()
  })

  it('幂等:重复执行不产生重复改动', async () => {
    const { migrations } = await freshModules()
    migrations.runMigrations()
    migrations.runMigrations()
    const db = readDb()
    expect(db.schema_version).toBe(15)
    expect(db.categories).toEqual([])
    expect(db.mistake_points).toHaveLength(1)
  })
})

describe('分类 CRUD', () => {
  it('创建大类/子类,两级封顶,列表按创建顺序', async () => {
    const { queries } = await freshModules()
    const { id: mathId } = queries.addCategory('数学')
    const { id: funcId } = queries.addCategory('函数', mathId)
    expect(mathId).toBe(1)
    expect(funcId).toBe(2)
    expect(() => queries.addCategory('孙子', funcId)).toThrow('分类最多两级')
    expect(queries.listCategories().map(c => [c.name, c.parent_id])).toEqual([
      ['数学', null],
      ['函数', mathId]
    ])
  })

  it('同级重名拒绝、跨级同名允许、空白名拒绝、超长截断到 50', async () => {
    const { queries } = await freshModules()
    const { id: mathId } = queries.addCategory('数学')
    queries.addCategory('函数', mathId)
    expect(() => queries.addCategory('数学')).toThrow('同级已存在同名分类')
    expect(() => queries.addCategory('函数', mathId)).toThrow('同级已存在同名分类')
    // 子类里叫「数学」与顶级「数学」不同级,允许
    expect(() => queries.addCategory('数学', mathId)).not.toThrow()
    expect(() => queries.addCategory('   ')).toThrow('分类名不能为空')
    const { id: longId } = queries.addCategory(`a`.repeat(80))
    expect(queries.listCategories().find(c => c.id === longId)!.name).toHaveLength(50)
  })

  it('改名校验同级唯一', async () => {
    const { queries } = await freshModules()
    const { id: a } = queries.addCategory('大类A')
    queries.addCategory('大类B')
    queries.updateCategory(a, '大类A改')
    expect(() => queries.updateCategory(a, '大类B')).toThrow('同级已存在同名分类')
    expect(readDb().categories.find((c: { id: number }) => c.id === a).name).toBe('大类A改')
  })

  it('删除大类:子分类上移为顶级、直接挂靠词条变未分类', async () => {
    const { queries } = await freshModules()
    const { id: mathId } = queries.addCategory('数学')
    const { id: funcId } = queries.addCategory('函数', mathId)
    queries.addCategory('几何')
    const mpOnFunc = queries.addMistakePoint('挂子类', funcId).id
    const mpOnMath = queries.addMistakePoint('挂大类', mathId).id
    const mtOnFunc = queries.addMistakeType('类型挂子类', funcId).id

    queries.deleteCategory(mathId)

    const db = readDb()
    expect(
      db.categories.map((c: { name: string; parent_id: number | null }) => [c.name, c.parent_id])
    ).toEqual([
      ['函数', null],
      ['几何', null]
    ])
    // 子分类上移后,挂子类的词条归属不变;直接挂被删大类的变未分类
    expect(db.mistake_points.find((m: { id: number }) => m.id === mpOnFunc).category_id).toBe(funcId)
    expect(db.mistake_points.find((m: { id: number }) => m.id === mpOnMath).category_id).toBeNull()
    expect(db.mistake_types.find((m: { id: number }) => m.id === mtOnFunc).category_id).toBe(funcId)
  })
})

describe('词条归类', () => {
  it('新增:带分类 / 缺省为未分类 / 悬空 id 防御性回落', async () => {
    const { queries } = await freshModules()
    const { id: mathId } = queries.addCategory('数学')
    const withCat = queries.addMistakePoint('带分类', mathId).id
    const noCat = queries.addMistakePoint('不带分类').id
    const dangling = queries.addMistakePoint('悬空', 999).id
    const db = readDb()
    expect(db.mistake_points.find((m: { id: number }) => m.id === withCat).category_id).toBe(mathId)
    expect(db.mistake_points.find((m: { id: number }) => m.id === noCat).category_id).toBeNull()
    expect(db.mistake_points.find((m: { id: number }) => m.id === dangling).category_id).toBeNull()
  })

  it('更新:undefined 保持原分类,null 显式改为未分类', async () => {
    const { queries } = await freshModules()
    const { id: mathId } = queries.addCategory('数学')
    const id = queries.addMistakePoint('p', mathId).id
    queries.updateMistakePoint(id, 'p改')
    expect(readDb().mistake_points.find((m: { id: number }) => m.id === id).category_id).toBe(mathId)
    queries.updateMistakePoint(id, 'p再改', null)
    expect(readDb().mistake_points.find((m: { id: number }) => m.id === id).category_id).toBeNull()

    const mtId = queries.addMistakeType('t', mathId).id
    queries.updateMistakeType(mtId, 't改', null)
    expect(readDb().mistake_types.find((m: { id: number }) => m.id === mtId).category_id).toBeNull()
  })
})
