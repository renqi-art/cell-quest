import { describe, expect, it } from 'vitest'
import { CaseHistory } from '@/editor/domain/case-history'
import { createCaseDraft } from '@/shared/services/CaseSchema'

describe('CaseHistory', () => {
  it('paint-cells command modifies the map', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    const history = new CaseHistory(draft)

    history.execute({ type: 'paint-cells', cells: [{ x: 2, y: 13, tile: '#' }] })
    expect(history.snapshot.map[13]?.[2]).toBe('#')

    history.undo()
    expect(history.snapshot.map[13]?.[2]).toBe(' ')
  })

  it('add-node and remove-node are undoable', () => {
    const history = new CaseHistory(createCaseDraft({ primaryCell: 'rbc' }))
    const node = { kind: 'target-tissue' as const, id: 't1', x: 5, y: 13, requiredOxygen: 3 }

    history.execute({ type: 'add-node', node })
    expect(history.snapshot.nodes.some(n => n.id === 't1')).toBe(true)

    history.undo()
    expect(history.snapshot.nodes.some(n => n.id === 't1')).toBe(false)

    history.redo()
    expect(history.snapshot.nodes.some(n => n.id === 't1')).toBe(true)

    history.execute({ type: 'remove-node', id: 't1' })
    expect(history.snapshot.nodes.some(n => n.id === 't1')).toBe(false)
  })

  it('redo is invalidated after a new command', () => {
    const history = new CaseHistory(createCaseDraft({ primaryCell: 'rbc' }))

    history.execute({ type: 'paint-cells', cells: [{ x: 1, y: 13, tile: '#' }] })
    history.undo()
    expect(history.canRedo).toBe(true)

    history.execute({ type: 'paint-cells', cells: [{ x: 3, y: 13, tile: '=' }] })
    expect(history.canRedo).toBe(false)
  })

  it('caps history at 50 entries', () => {
    const history = new CaseHistory(createCaseDraft({ primaryCell: 'rbc' }))

    for (let i = 0; i < 55; i++) {
      history.execute({ type: 'paint-cells', cells: [{ x: i, y: 13, tile: '#' }] })
    }

    let undoCount = 0
    while (history.canUndo) {
      history.undo()
      undoCount++
    }
    expect(undoCount).toBe(50)
  })

  it('move-node updates position', () => {
    const history = new CaseHistory(createCaseDraft({ primaryCell: 'rbc' }))
    const spawnNode = history.snapshot.nodes[0]!
    const originalId = spawnNode.id

    history.execute({ type: 'move-node', id: originalId, x: 10, y: 10 })
    const moved = history.snapshot.nodes.find(n => n.id === originalId)!
    expect(moved.x).toBe(10)
    expect(moved.y).toBe(10)

    history.undo()
    const undone = history.snapshot.nodes.find(n => n.id === originalId)!
    expect(undone.x).toBe(spawnNode.x)
    expect(undone.y).toBe(spawnNode.y)
  })

  it('replace-config updates caseConfig', () => {
    const history = new CaseHistory(createCaseDraft({ primaryCell: 'rbc' }))
    const newConfig = { ...history.snapshot.caseConfig!, allyMode: 'second-player' as const }

    history.execute({ type: 'replace-config', config: newConfig })
    expect(history.snapshot.caseConfig?.allyMode).toBe('second-player')

    history.undo()
    expect(history.snapshot.caseConfig?.allyMode).toBe('scripted')
  })
})
