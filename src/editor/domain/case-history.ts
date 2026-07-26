import type { CaseDraft } from '@/shared/models/case-draft'
import type { CaseCommand } from './case-commands'
import { applyCaseCommand } from './case-commands'

const MAX_HISTORY = 50

export class CaseHistory {
  private readonly undoStack: CaseDraft[] = []
  private redoStack: CaseDraft[] = []
  private _snapshot: CaseDraft

  constructor(initial: CaseDraft) {
    this._snapshot = initial
  }

  get snapshot(): CaseDraft {
    return this._snapshot
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  execute(command: CaseCommand): void {
    this.undoStack.push(this._snapshot)
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift()
    }
    this._snapshot = applyCaseCommand(this._snapshot, command)
    this.redoStack = []
  }

  undo(): void {
    if (!this.canUndo) return
    this.redoStack.push(this._snapshot)
    this._snapshot = this.undoStack.pop()!
  }

  redo(): void {
    if (!this.canRedo) return
    this.undoStack.push(this._snapshot)
    this._snapshot = this.redoStack.pop()!
  }
}
