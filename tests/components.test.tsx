import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../src/components/ui/Button'
import { Badge } from '../src/components/shared/Badge'
import { ErrorBar, SuccessBar } from '../src/components/shared/Bars'
import EmptyState from '../src/components/shared/EmptyState'
import ConfirmDialog from '../src/components/shared/ConfirmDialog'

describe('Button', () => {
  it('点击触发回调', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>确定</Button>)
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('禁用时不触发回调', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        禁用
      </Button>
    )
    const btn = screen.getByRole('button', { name: '禁用' })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Badge', () => {
  it('渲染文本与默认变体', () => {
    render(<Badge>5</Badge>)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

describe('ErrorBar / SuccessBar', () => {
  it('ErrorBar 渲染错误信息', () => {
    render(<ErrorBar>加载失败</ErrorBar>)
    expect(screen.getByText('加载失败')).toBeInTheDocument()
  })

  it('SuccessBar 渲染成功信息', () => {
    render(<SuccessBar>已保存</SuccessBar>)
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('渲染标题与描述', () => {
    render(<EmptyState icon="🌱" title="暂无数据" description="先添加点什么" />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(screen.getByText('先添加点什么')).toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  it('打开时展示标题与描述', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="确认删除"
        description="此操作不可撤销"
        onConfirm={() => {}}
      />
    )
    expect(screen.getByText('确认删除')).toBeInTheDocument()
    expect(screen.getByText('此操作不可撤销')).toBeInTheDocument()
  })

  it('取消按钮回调 onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="t" onConfirm={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('确认按钮回调 onConfirm（关闭由调用方控制）', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="t"
        onConfirm={onConfirm}
        confirmText="确认重置"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '确认重置' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('关闭状态不渲染内容', () => {
    render(<ConfirmDialog open={false} onOpenChange={() => {}} title="隐藏标题" onConfirm={() => {}} />)
    expect(screen.queryByText('隐藏标题')).not.toBeInTheDocument()
  })
})
