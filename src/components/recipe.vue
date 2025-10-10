<!-- JamTotals.vue -->
<template>
  <div class="max-w-md mx-auto p-4 space-y-4">
    <div class="rounded-lg border p-4">
      <div class="flex items-center gap-2 mb-3">
        <h2 class="text-lg font-bold">果醬總用量</h2>
        <select v-model="recipeKey" class="select border rounded px-2 py-1 text-sm">
          <option v-for="key in recipeOrder" :key="key" :value="key">{{ recipes[key].name }}</option>
        </select>
      </div>

      <!-- 罐數（每種口味各自保存；最低 0） -->
      <div class="font-semibold mb-2">
        <button class="inline-btn" @click="dec" :disabled="jarCounts[recipeKey] <= MIN_JARS">−</button>
        <input
          type="number"
          :min="MIN_JARS"
          step="1"
          :value="jarCounts[recipeKey]"
          class="inline-input border rounded px-2 py-1 text-sm"
          readonly
          @wheel.prevent
          aria-label="想做幾罐"
        />
        <button class="inline-btn" @click="inc">＋</button>
        <!-- 一罐 250g + 總成品重量（隨罐數變動） -->
        <span class="muted"> &nbsp;&nbsp;{{ finishedWeightCurrent }}g</span>
      </div>

      <!-- 上排（水平）：主顆數/重量 + 檸檬/蘋果加成（0 也顯示） -->
      <div class="meta-row mt-1">
        <template v-if="current.count">
          <span>{{ current.name }} <strong>{{ mainFruitCount }}</strong> {{ current.count.unit }}</span>
        </template>
        <template v-else-if="current.headWeight">
          <span>{{ current.headWeight.label }} <strong>{{ totalHeadWeight }}</strong> {{ current.headWeight.unit }}</span>
        </template>

        <span>細砂糖 <strong>{{ sugarCurrent }}</strong> g</span>

        <span v-if="lemonAddonShown">檸檬 <strong>{{ fmt1(0.5 * nCurrent) }}</strong> 顆</span>
      </div>

      <!-- 細項食譜（當前口味總量） -->
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li v-for="ing in totalIngredients" :key="ing.label">
          {{ ing.label }}：<strong>{{ ing.total }}</strong> {{ ing.unit }}
        </li>
      </ul>
    </div>

    <!-- 全部品項合計 + 價格（清單列 3 種柑橘 + 藍莓 + 砂糖） -->
    <div class="rounded-lg border p-4">
      <h3 class="font-semibold mb-2">全部品項合計</h3>
      <ul class="list-disc pl-5 space-y-1">
        <li>
          檸檬：<strong>{{ fmt1(totalsAll.fruitTotals.lemon) }}</strong> 顆
          — <strong>{{ money(itemCosts.lemon) }}</strong> 元
        </li>
        <li>
          柳橙：<strong>{{ fmt1(totalsAll.fruitTotals.orange) }}</strong> 顆
          — <strong>{{ money(itemCosts.orange) }}</strong> 元
        </li>
        <li>
          葡萄柚：<strong>{{ fmt1(totalsAll.fruitTotals.grapefruit) }}</strong> 顆
          — <strong>{{ money(itemCosts.grapefruit) }}</strong> 元
        </li>
        <li>
          藍莓：<strong>{{ totalsAll.fruitTotals.blueberry }}</strong> g
          — <strong>{{ money(itemCosts.blueberry) }}</strong> 元
        </li>
        <!-- 砂糖作為清單最後一項 -->
        <li>
          細砂糖：<strong>{{ sugarAll }}</strong> g
          — <strong>{{ money(itemCosts.sugar) }}</strong> 元
        </li>
      </ul>

      <div class="mt-3 flex items-center justify-between">
        <div class="font-bold">
          總價：<span class="text-lg"><strong>{{ money(itemCosts.total) }}</strong> 元</span>
        </div>
        <button class="clear-btn" @click="clearAll" title="全部清除">全部清除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

/* ---------------- Config ---------------- */
const MIN_JARS = 0
const PER_JAR_FINISHED = 250 // 每罐成品重量 250g（顯示用）

// 價格
const PRICE = {
  lemonPerPiece: 13,
  orangePerPiece: 26,
  grapefruitPerPiece: 20,
  blueberryPerGram: 85 / 125,
  sugarPerKg: 36,
}
PRICE.sugarPerGram = PRICE.sugarPerKg / 1000  // 0.044 元/g

// 每罐砂糖用量（固定 120g）
const SUGAR_PER_JAR = 120

// 配方（每 1 罐 250g 成品）
const recipes = {
  lemon: {
    name: '檸檬',
    count: { perJar: 5, unit: '顆' },
    ingredients: [
      { label: '檸檬汁', perJar: 180, unit: 'g' },
      { label: '細砂糖', perJar: 120, unit: 'g' },
      { label: '檸檬皮', perJar: 25, unit: 'g' },
    ],
  },
  orange: {
    name: '柳橙',
    count: { perJar: 3.5, unit: '顆' },
    ingredients: [
      { label: '柳橙汁', perJar: 150, unit: 'g' },
      { label: '細砂糖', perJar: 120, unit: 'g' },
      { label: '檸檬汁', perJar: 20, unit: 'cc' },
      { label: '柳橙皮', perJar: 35, unit: 'g' },
      { label: '柳橙果肉', perJar: 70, unit: 'g' },
    ],
  },
  grapefruit: {
    name: '葡萄柚',
    count: { perJar: 1.7, unit: '顆' },
    ingredients: [
      { label: '葡萄柚汁', perJar: 150, unit: 'g' },
      { label: '細砂糖', perJar: 120, unit: 'g' },
      { label: '檸檬汁', perJar: 20, unit: 'cc' },
      { label: '葡萄柚皮', perJar: 35, unit: 'g' },
      { label: '葡萄柚果肉', perJar: 70, unit: 'g' },
    ],
  },
  blueberry: {
    name: '藍莓',
    headWeight: { label: '藍莓', perJar: 200, unit: 'g' }, // 130 + 70
    ingredients: [
      { label: '藍莓肉', perJar: 130, unit: 'g' },
      { label: '細砂糖', perJar: 120, unit: 'g' },
      { label: '檸檬汁', perJar: 20, unit: 'cc' },
      { label: '藍莓果肉', perJar: 70, unit: 'g' },
    ],
  },
}

// 下拉排序（已移除 apple, grape）
const recipeOrder = ['lemon', 'orange', 'grapefruit', 'blueberry']

/* ---------------- State ---------------- */
const jarCounts = reactive({
  lemon: 0,
  orange: 0,
  grapefruit: 0,
  blueberry: 0,
})
const recipeKey = ref('lemon')

/* ---------------- Actions ---------------- */
function inc() {
  const k = recipeKey.value
  jarCounts[k] = Math.max(MIN_JARS, Math.floor(jarCounts[k]) + 1)
}
function dec() {
  const k = recipeKey.value
  jarCounts[k] = Math.max(MIN_JARS, Math.floor(jarCounts[k]) - 1)
}
function clearAll() {
  for (const k of recipeOrder) jarCounts[k] = 0
}

/* ---------------- Derived (current view) ---------------- */
const current = computed(() => recipes[recipeKey.value])
const nCurrent = computed(() => Math.max(MIN_JARS, Math.floor(jarCounts[recipeKey.value])))

function fmt1(x) {
  const v = Math.round(x * 10) / 10
  return Number.isInteger(v) ? v : v.toFixed(1)
}
function fmtMainCountByKey(_key, x) { return fmt1(x) }

const mainFruitCount = computed(() => {
  if (!current.value.count) return null
  const base = current.value.count.perJar * nCurrent.value
  return fmtMainCountByKey(recipeKey.value, base)
})
const totalHeadWeight = computed(() => {
  if (!current.value.headWeight) return null
  return Math.round(current.value.headWeight.perJar * nCurrent.value + 1e-9)
})

// 當前口味砂糖（meta-row 顯示）
const sugarCurrent = computed(() => Math.round(SUGAR_PER_JAR * nCurrent.value + 1e-9))

// 罐數旁邊顯示的成品總重量
const finishedWeightCurrent = computed(() => PER_JAR_FINISHED * nCurrent.value)

const hasLemonJuiceCurrent = computed(() =>
  (current.value.ingredients || []).some(i => i.label === '檸檬汁')
)
const lemonAddonShown = computed(() =>
  hasLemonJuiceCurrent.value && recipeKey.value !== 'lemon'
)

const totalIngredients = computed(() => {
  const list = current.value.ingredients || []
  return list.map(ing => ({
    label: ing.label,
    total: Math.round(Number(ing.perJar) * nCurrent.value + 1e-9),
    unit: ing.unit,
  }))
})

/* ---------------- Totals (all flavors) ---------------- */
const totalsAll = computed(() => {
  const mainCounts = { lemon: 0, orange: 0, grapefruit: 0 }
  const headWeights = { blueberry: 0 }
  let lemonExtra = 0
  let totalJars = 0

  for (let i = 0; i < recipeOrder.length; i++) {
    const key = recipeOrder[i]
    const cfg = recipes[key]
    const n = Math.max(MIN_JARS, Math.floor(jarCounts[key]))

    totalJars += n

    if (cfg.count) {
      mainCounts[key] += cfg.count.perJar * n
    } else if (cfg.headWeight) {
      headWeights[key] += Math.round(cfg.headWeight.perJar * n + 1e-9)
    }

    const hasLemon = (cfg.ingredients || []).some(x => x.label === '檸檬汁')
    if (hasLemon && key !== 'lemon') lemonExtra += 0.5 * n
  }

  const fruitTotals = {
    lemon: mainCounts.lemon + lemonExtra,
    orange: mainCounts.orange,
    grapefruit: mainCounts.grapefruit,
    blueberry: headWeights.blueberry, // g
  }

  // 砂糖總量（g）
  const sugar = Math.round(SUGAR_PER_JAR * totalJars + 1e-9)

  return { fruitTotals, totalJars, sugar }
})

/* ---------------- Pricing ---------------- */
function money(x) { return Math.round(Number(x) + 1e-9) } // 四捨五入到元

// 砂糖總克數（清單要顯示）
const sugarAll = computed(() => totalsAll.value.sugar)

const itemCosts = computed(() => {
  const t = totalsAll.value.fruitTotals
  const lemon = t.lemon * PRICE.lemonPerPiece
  const orange = t.orange * PRICE.orangePerPiece
  const grapefruit = t.grapefruit * PRICE.grapefruitPerPiece
  const blueberry = t.blueberry * PRICE.blueberryPerGram

  const sugar = sugarAll.value * PRICE.sugarPerGram

  const total = lemon + orange + grapefruit + blueberry + sugar
  return { lemon, orange, grapefruit, blueberry, sugar, total }
})
</script>

<style scoped>
.select { min-width: 96px; }

/* 內嵌小輸入框 */
.inline-input { width: 64px; display: inline-block; text-align: center; vertical-align: baseline; }

/* 內嵌小按鈕 */
.inline-btn {
  display: inline-block; padding: 2px 8px; margin: 0 4px; line-height: 1.25;
  border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;
  cursor: pointer; user-select: none;
}
.inline-btn:hover { background: #f3f4f6; }
.inline-btn:active { background: #e5e7eb; }
.inline-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.clear-btn {
  padding: 4px 10px;
  border: 1px solid #ef4444;        /* red-500 */
  border-radius: 6px;
  background: #fff;
  color: #ef4444;
  cursor: pointer;
}
.clear-btn:hover { background: #fee2e2; } /* red-100 */

/* 水平資訊列（上排） */
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: baseline;
}

/* 罐數旁邊淡色文字 */
.muted { color: #6b7280; font-weight: normal; font-size: 0.875rem; }

/* 隱藏 number 的上下箭頭（Chrome/Safari） */
.inline-input::-webkit-outer-spin-button,
.inline-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
/* Firefox 用標準屬性 */
.inline-input[type="number"] { appearance: textfield; }
</style>
