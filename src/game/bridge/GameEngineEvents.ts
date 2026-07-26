import type { GameEngineEventMap } from '@/shared/types/events'
import { TypedEventBus } from '@/shared/utils/TypedEventBus'

export class GameEngineEvents extends TypedEventBus<GameEngineEventMap> {}
