import type { ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/Dialog'
import { Button } from '../ui/Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** Extra content between description and footer (e.g. inputs) */
  children?: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'destructive'
  onConfirm: () => void
}

/** Standard confirmation dialog — title + description + optional body + cancel/confirm. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button variant={variant} size="sm" onClick={() => onConfirm()}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
