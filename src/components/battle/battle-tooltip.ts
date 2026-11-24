import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react'
import { usesBattleDetailsPanel } from './BattleDetails'

function positionBattleTooltip(event: ReactPointerEvent<HTMLElement>, tooltipId: string) {
  if (usesBattleDetailsPanel() || event.pointerType === 'touch') return
  const tooltip = document.getElementById(tooltipId)
  if (!tooltip) return
  tooltip.classList.add('is-pointer-positioned')
  tooltip.style.display = 'grid'
  const gap = 10
  const bounds = tooltip.getBoundingClientRect()
  const left = Math.max(gap, Math.min(event.clientX + gap, window.innerWidth - bounds.width - gap))
  const top = Math.max(gap, Math.min(event.clientY + gap, window.innerHeight - bounds.height - gap))
  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
  tooltip.style.right = 'auto'
  tooltip.style.bottom = 'auto'
}

function resetBattleTooltip(tooltipId: string) {
  const tooltip = document.getElementById(tooltipId)
  if (!tooltip) return
  tooltip.style.removeProperty('display')
  tooltip.style.removeProperty('left')
  tooltip.style.removeProperty('top')
  tooltip.style.removeProperty('right')
  tooltip.style.removeProperty('bottom')
  tooltip.classList.remove('is-pointer-positioned')
}

function positionBattleTooltipAtTrigger(trigger: HTMLElement, tooltipId: string) {
  if (usesBattleDetailsPanel()) return
  const tooltip = document.getElementById(tooltipId)
  if (!tooltip) return
  tooltip.classList.add('is-pointer-positioned')
  tooltip.style.display = 'grid'
  const gap = 10
  const triggerBounds = trigger.getBoundingClientRect()
  const tooltipBounds = tooltip.getBoundingClientRect()
  const left = Math.max(gap, Math.min(triggerBounds.left, window.innerWidth - tooltipBounds.width - gap))
  const preferredTop = triggerBounds.bottom + gap
  const top = Math.max(
    gap,
    Math.min(
      window.innerHeight - tooltipBounds.height - gap,
      preferredTop + tooltipBounds.height <= window.innerHeight
        ? preferredTop
        : triggerBounds.top - tooltipBounds.height - gap,
    ),
  )
  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
  tooltip.style.right = 'auto'
  tooltip.style.bottom = 'auto'
}

export function battleTooltipBindings(tooltipId: string): HTMLAttributes<HTMLElement> {
  const reset = () => resetBattleTooltip(tooltipId)
  const follow = (event: ReactPointerEvent<HTMLElement>) => positionBattleTooltip(event, tooltipId)
  return {
    onFocus: (event) => positionBattleTooltipAtTrigger(event.currentTarget, tooltipId),
    onBlur: reset,
    onPointerEnter: follow,
    onPointerMove: follow,
    onPointerLeave: reset,
  }
}
