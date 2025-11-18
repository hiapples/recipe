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
        <span class="muted"> &nbsp;&nbsp;{{ finishedWeightCurrent }}g</span>
      </div>

      <!-- 上排（水平）：只顯示「水果」（含 0 也顯示；不顯示糖） -->
      <div class="meta-row mt-1">
        <span v-for="m in metaRowList" :key="m.key">
          {{ m.label }} <strong>{{ m.value }}</strong> {{ m.unit }}
        </span>
      </div>

      <!-- 細項食譜（當前口味總量；保留完整細項清單） -->
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li v-for="(ing, idx) in totalIngredients" :key="ing.label + '-' + idx">
          {{ ing.label }}：<strong>{{ ing.total }}</strong> {{ ing.unit }}
        </li>
      </ul>
    </div>

    <!-- 全部品項合計 + 價格（3 柑橘 + 蘋果 + 藍莓 + 砂糖） -->
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
          蘋果：<strong>{{ fmt1(totalsAll.fruitTotals.apple) }}</strong> 顆
          — <strong>{{ money(itemCosts.apple) }}</strong> 元
        </li>
        <li>
          藍莓：<strong>{{ totalsAll.fruitTotals.blueberry }}</strong> g
          — <strong>{{ money(itemCosts.blueberry) }}</strong> 元
        </li>
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
const SUGAR_PER_JAR = 120    // 每罐砂糖用量固定 120g（上排不顯示，但合計仍計算）

// 價格
const PRICE = {
  lemonPerPiece: 18,
  orangePerPiece: 7,
  grapefruitPerPiece: 34,
  applePerPiece: 33,                 // 蘋果 1 顆 20 元
  blueberryPerGram: 46 / 125,
  sugarPerKg: 44,
}
PRICE.sugarPerGram = PRICE.sugarPerKg / 1000  // 0.036 元/g

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
    count: { perJar: 1.8, unit: '顆' },
    ingredients: [
      { label: '葡萄柚汁', perJar: 150, unit: 'g' },
      { label: '細砂糖', perJar: 120, unit: 'g' },
      { label: '檸檬汁', perJar: 20, unit: 'cc' },
      { label: '葡萄柚皮', perJar: 40, unit: 'g' },
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
  // 新增：綜合水果（細項材料 + 顆數成本由 extraCounts 併入總表）
  mixed: {
    name: '綜合水果',
    // 每罐顆數換算：葡萄柚 1 顆、柳橙 2 顆、蘋果 1 顆
    extraCounts: { grapefruit: 1, orange: 2.2, apple: 0.5 },
    ingredients: [
      { label: '葡萄柚汁', perJar: 50, unit: 'g' },
      { label: '葡萄柚果肉', perJar: 25, unit: 'g' },
      { label: '葡萄柚皮', perJar: 10, unit: 'g' },

      { label: '柳橙汁', perJar: 80, unit: 'g' },
      { label: '柳橙果肉', perJar: 25, unit: 'g' },
      { label: '柳橙皮', perJar: 10, unit: 'g' },

      { label: '蘋果泥', perJar: 45, unit: 'g' },
      { label: '蘋果果肉', perJar: 20, unit: 'g' },

      { label: '細砂糖', perJar: 120, unit: 'g' },
      { label: '檸檬汁', perJar: 20, unit: 'cc' }, // 觸發檸檬 +0.5 顆/罐
    ],
  },
}

// 下拉排序
const recipeOrder = ['lemon', 'orange', 'grapefruit', 'blueberry', 'mixed']

/* ---------------- State ---------------- */
const jarCounts = reactive({
  lemon: 0,
  orange: 0,
  grapefruit: 0,
  blueberry: 0,
  mixed: 0,
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
  for (let i = 0; i < recipeOrder.length; i++) {
    const k = recipeOrder[i]
    jarCounts[k] = 0
  }
}

/* ---------------- Derived (current view) ---------------- */
const current = computed(function () { return recipes[recipeKey.value] })
const nCurrent = computed(function () { return Math.max(MIN_JARS, Math.floor(jarCounts[recipeKey.value])) })

function fmt1(x) {
  const v = Math.round(x * 10) / 10
  return Number.isInteger(v) ? v : v.toFixed(1)
}
function fmtMainCountByKey(_key, x) { return fmt1(x) }

// 罐數旁邊顯示的成品總重量
const finishedWeightCurrent = computed(function () { return PER_JAR_FINISHED * nCurrent.value })

// 上排：只顯示「水果」（不顯示糖；含 0）
const metaRowList = computed(function () {
  const n = nCurrent.value
  const key = recipeKey.value
  const cfg = current.value
  const out = []

  // 1) 主要水果
  if (cfg.count) {
    // 柑橘類以顆數
    out.push({ key: 'main-fruit', label: cfg.name, value: fmt1(cfg.count.perJar * n), unit: '顆' })
  } else if (cfg.headWeight) {
    // 藍莓以克
    out.push({ key: 'main-blueberry', label: cfg.headWeight.label, value: Math.round(cfg.headWeight.perJar * n + 1e-9), unit: cfg.headWeight.unit })
  }

  // 2) 綜合水果：顆數（葡萄柚/柳橙/蘋果）
  if (cfg.extraCounts) {
    const ec = cfg.extraCounts
    if (ec.grapefruit) out.push({ key: 'mix-grapefruit', label: '葡萄柚', value: fmt1(ec.grapefruit * n), unit: '顆' })
    if (ec.orange) out.push({ key: 'mix-orange', label: '柳橙', value: fmt1(ec.orange * n), unit: '顆' })
    if (ec.apple) out.push({ key: 'mix-apple', label: '蘋果', value: fmt1(ec.apple * n), unit: '顆' })
  }

  // 3) 檸檬加成：凡含「檸檬汁」且不是檸檬口味本身 → +0.5 顆/罐
  const hasLemonJuice = (cfg.ingredients || []).some(function (x) { return x.label === '檸檬汁' })
  if (hasLemonJuice && key !== 'lemon') {
    out.push({ key: 'lemon-extra', label: '檸檬', value: fmt1(0.5 * n), unit: '顆' })
  }

  return out
})

// 當前口味的細項（保留完整明細）
const totalIngredients = computed(function () {
  const list = current.value.ingredients || []
  const out = []
  for (let i = 0; i < list.length; i++) {
    const ing = list[i]
    out.push({
      label: ing.label,
      total: Math.round(Number(ing.perJar) * nCurrent.value + 1e-9),
      unit: ing.unit,
    })
  }
  return out
})

/* ---------------- Totals (all flavors) ---------------- */
const totalsAll = computed(function () {
  const mainCounts = { lemon: 0, orange: 0, grapefruit: 0, apple: 0 }
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

    // 綜合水果：把顆數併入總表
    if (cfg.extraCounts) {
      if (cfg.extraCounts.orange) mainCounts.orange += cfg.extraCounts.orange * n
      if (cfg.extraCounts.grapefruit) mainCounts.grapefruit += cfg.extraCounts.grapefruit * n
      if (cfg.extraCounts.apple) mainCounts.apple += cfg.extraCounts.apple * n
    }

    const hasLemon = (cfg.ingredients || []).some(function (x) { return x.label === '檸檬汁' })
    if (hasLemon && key !== 'lemon') lemonExtra += 0.5 * n
  }

  const fruitTotals = {
    lemon: mainCounts.lemon + lemonExtra,
    orange: mainCounts.orange,
    grapefruit: mainCounts.grapefruit,
    apple: mainCounts.apple,           // 顆
    blueberry: headWeights.blueberry,  // g
  }

  // 砂糖總量（g）
  const sugar = Math.round(SUGAR_PER_JAR * totalJars + 1e-9)

  return { fruitTotals: fruitTotals, totalJars: totalJars, sugar: sugar }
})

/* ---------------- Pricing ---------------- */
function money(x) { return Math.round(Number(x) + 1e-9) } // 四捨五入到元

// 砂糖總克數（清單要顯示）
const sugarAll = computed(function () { return totalsAll.value.sugar })

const itemCosts = computed(function () {
  const t = totalsAll.value.fruitTotals
  const lemon = t.lemon * PRICE.lemonPerPiece
  const orange = t.orange * PRICE.orangePerPiece
  const grapefruit = t.grapefruit * PRICE.grapefruitPerPiece
  const apple = t.apple * PRICE.applePerPiece
  const blueberry = t.blueberry * PRICE.blueberryPerGram
  const sugar = sugarAll.value * PRICE.sugarPerGram

  const total = lemon + orange + grapefruit + apple + blueberry + sugar
  return { lemon: lemon, orange: orange, grapefruit: grapefruit, apple: apple, blueberry: blueberry, sugar: sugar, total: total }
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
