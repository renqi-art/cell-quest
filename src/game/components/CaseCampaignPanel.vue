<script setup lang="ts">
import { ref } from 'vue'
import { OFFICIAL_CASES, type OfficialCaseChapter } from '@/shared/content/official-cases'

const emit = defineEmits<{ start: [officialCase: OfficialCaseChapter] }>()
const open = ref(false)
</script>

<template>
  <div class="campaign-shell">
    <button type="button" class="campaign-trigger" data-testid="open-campaign" @click="open = true">
      病例战役 · 六章患者康复
    </button>
    <div v-if="open" class="campaign-overlay" @click.self="open = false">
      <section class="campaign-panel" role="dialog" aria-modal="true" aria-label="六章病例战役">
        <header>
          <div>
            <p class="eyebrow">CELL QUEST PATIENT JOURNEY</p>
            <h2>从擦伤感染到康复</h2>
            <p>运输、防御与免疫记忆共同稳定同一名患者。</p>
          </div>
          <button type="button" aria-label="关闭病例战役" @click="open = false">×</button>
        </header>
        <ol class="chapter-list">
          <li
            v-for="officialCase in OFFICIAL_CASES"
            :key="officialCase.id"
            :data-case-chapter="officialCase.chapter"
          >
            <span class="chapter-index">{{ officialCase.chapter }}</span>
            <div>
              <h3>{{ officialCase.draft.metadata.icon }} {{ officialCase.draft.metadata.title }}</h3>
              <p>{{ officialCase.patientBeat }}</p>
              <p class="learning">学习目标：{{ officialCase.learningObjective }}</p>
              <div class="sources">
                <a v-for="source in officialCase.sources" :key="source.id" :href="source.url" target="_blank" rel="noreferrer">{{ source.title }}</a>
              </div>
            </div>
            <button type="button" data-testid="start-official-case" @click="emit('start', officialCase)">
              开始病例
            </button>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<style scoped>
.campaign-trigger { position: fixed; right: 18px; bottom: 18px; z-index: 120; padding: 10px 16px; border: 1px solid #6b8ef5; border-radius: 999px; background: rgb(13 22 48 / 92%); color: #f3f7ff; font-weight: 700; box-shadow: 0 10px 28px rgb(0 0 0 / 35%); }
.campaign-overlay { position: fixed; inset: 0; z-index: 140; display: grid; place-items: center; padding: 20px; background: rgb(2 5 14 / 82%); }
.campaign-panel { width: min(920px, 96vw); max-height: 88vh; overflow: auto; border: 1px solid #405a96; border-radius: 18px; background: linear-gradient(145deg, #10182d, #090d19); color: #f3f6ff; }
.campaign-panel > header { display: flex; justify-content: space-between; gap: 20px; padding: 22px; border-bottom: 1px solid #28385f; }
.eyebrow { color: #78a6ff; font-size: 10px; letter-spacing: .16em; }
h2 { margin: 4px 0; }
.chapter-list { display: grid; gap: 10px; margin: 0; padding: 18px; list-style: none; }
.chapter-list li { display: grid; grid-template-columns: 34px 1fr auto; gap: 14px; align-items: start; padding: 14px; border: 1px solid #27375d; border-radius: 12px; background: #111a31; }
.chapter-index { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #3f5ba2; font-weight: 800; }
h3, p { margin: 0 0 5px; }
.chapter-list p { color: #b8c4de; font-size: 12px; }
.learning { color: #8eddb0 !important; }
.sources { display: flex; flex-wrap: wrap; gap: 8px; }
.sources a { color: #8fb7ff; font-size: 10px; }
button { cursor: pointer; }
@media (max-width: 700px) { .chapter-list li { grid-template-columns: 30px 1fr; } .chapter-list li > button { grid-column: 2; justify-self: start; } }
</style>
