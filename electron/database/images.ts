import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import crypto from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per image
const MAX_IMAGES_PER_KNOWLEDGE = 50

function getImagesDir(kpId: number): string {
  return path.join(app.getPath('userData'), 'images', String(kpId))
}

function countImages(kpId: number): number {
  const dir = getImagesDir(kpId)
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).length
}

export function saveImage(kpId: number, fileData: Uint8Array, originalName: string): string {
  // Enforce size limit
  if (fileData.byteLength > MAX_FILE_SIZE) {
    throw new Error(`图片大小超过限制（最大 10MB）`)
  }

  // Enforce per-knowledge-point image count limit
  if (countImages(kpId) >= MAX_IMAGES_PER_KNOWLEDGE) {
    throw new Error(`每个知识点最多 ${MAX_IMAGES_PER_KNOWLEDGE} 张图片`)
  }

  const dir = getImagesDir(kpId)
  fs.mkdirSync(dir, { recursive: true })

  const ext = path.extname(originalName) || '.jpg'
  const name = crypto.randomUUID() + ext
  const dest = path.join(dir, name)

  fs.writeFileSync(dest, Buffer.from(fileData))
  return name
}

export function deleteImages(kpId: number): void {
  const dir = getImagesDir(kpId)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** Scan markdown for kcimg:// references and remove unreferenced image files */
export function deleteOrphanImages(kpId: number, detail: string): void {
  const dir = getImagesDir(kpId)
  if (!fs.existsSync(dir)) return

  // Extract all referenced filenames from markdown: ![alt](kcimg://kpId/filename)
  const refPattern = new RegExp(`kcimg://${kpId}/([^)\\s]+)`, 'g')
  const referencedFiles = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = refPattern.exec(detail)) !== null) {
    referencedFiles.add(decodeURIComponent(match[1]))
  }

  // Delete files on disk that are NOT referenced in the markdown
  const filesOnDisk = fs.readdirSync(dir)
  for (const file of filesOnDisk) {
    if (!referencedFiles.has(file)) {
      fs.unlinkSync(path.join(dir, file))
    }
  }
}
