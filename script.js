/* =============================================================
   AI EXPENSE LEAK DETECTOR — script.js
   All figures are calculated dynamically from transaction data.
   ============================================================= */

// ─── DEMO DATA (35+ transactions) ────────────────────────────────────────────
const DEMO_TRANSACTIONS = [
  // INCOME
  { date:"2026-08-01", merchant:"Infosys Ltd",        category:"Salary",        amount:35000, type:"income",  recurring:true  },

  // RENT & BILLS
  { date:"2026-08-02", merchant:"House Rent",          category:"Rent",          amount:8000,  type:"expense", recurring:true  },
  { date:"2026-08-05", merchant:"BESCOM Electricity",  category:"Bills",         amount:950,   type:"expense", recurring:true  },
  { date:"2026-08-06", merchant:"ACT Fibernet",        category:"Bills",         amount:799,   type:"expense", recurring:true  },
  { date:"2026-08-07", merchant:"Jio Mobile",          category:"Bills",         amount:299,   type:"expense", recurring:true  },

  // SUBSCRIPTIONS
  { date:"2026-08-03", merchant:"Netflix",             category:"Subscription",  amount:649,   type:"expense", recurring:true  },
  { date:"2026-08-03", merchant:"Spotify",             category:"Subscription",  amount:119,   type:"expense", recurring:true  },
  { date:"2026-08-04", merchant:"Amazon Prime",        category:"Subscription",  amount:299,   type:"expense", recurring:true  },
  { date:"2026-08-10", merchant:"Hotstar",             category:"Subscription",  amount:299,   type:"expense", recurring:true  },

  // GYM
  { date:"2026-08-04", merchant:"Cult.fit Gym",        category:"Health",        amount:999,   type:"expense", recurring:true  },

  // FOOD DELIVERY (spike vs prev month ₹3,800)
  { date:"2026-08-02", merchant:"Swiggy",              category:"Food Delivery", amount:850,   type:"expense", recurring:false },
  { date:"2026-08-04", merchant:"Zomato",              category:"Food Delivery", amount:620,   type:"expense", recurring:false },
  { date:"2026-08-06", merchant:"Swiggy",              category:"Food Delivery", amount:740,   type:"expense", recurring:false },
  { date:"2026-08-09", merchant:"Zomato",              category:"Food Delivery", amount:990,   type:"expense", recurring:false },
  { date:"2026-08-12", merchant:"Swiggy",              category:"Food Delivery", amount:540,   type:"expense", recurring:false },
  { date:"2026-08-15", merchant:"Zomato",              category:"Food Delivery", amount:460,   type:"expense", recurring:false },
  { date:"2026-08-18", merchant:"Swiggy",              category:"Food Delivery", amount:600,   type:"expense", recurring:false },

  // GROCERIES
  { date:"2026-08-08", merchant:"BigBasket",           category:"Groceries",     amount:1800,  type:"expense", recurring:false },
  { date:"2026-08-20", merchant:"DMart",               category:"Groceries",     amount:1400,  type:"expense", recurring:false },

  // TRANSPORT
  { date:"2026-08-03", merchant:"Uber",                category:"Transport",     amount:320,   type:"expense", recurring:false },
  { date:"2026-08-07", merchant:"Ola",                 category:"Transport",     amount:280,   type:"expense", recurring:false },
  { date:"2026-08-11", merchant:"BMTC Bus",            category:"Transport",     amount:120,   type:"expense", recurring:false },
  { date:"2026-08-14", merchant:"Uber",                category:"Transport",     amount:450,   type:"expense", recurring:false },
  { date:"2026-08-16", merchant:"HPCL Fuel",           category:"Transport",     amount:800,   type:"expense", recurring:false },

  // SHOPPING (spike: prev ₹2,600 → current ₹3,850)
  { date:"2026-08-05", merchant:"Myntra",              category:"Shopping",      amount:1200,  type:"expense", recurring:false },
  { date:"2026-08-13", merchant:"Amazon Shopping",     category:"Shopping",      amount:1350,  type:"expense", recurring:false },
  { date:"2026-08-19", merchant:"Flipkart",            category:"Shopping",      amount:850,   type:"expense", recurring:false },
  { date:"2026-08-22", merchant:"Nykaa",               category:"Shopping",      amount:450,   type:"expense", recurring:false },

  // ENTERTAINMENT
  { date:"2026-08-08", merchant:"PVR Cinemas",         category:"Entertainment", amount:650,   type:"expense", recurring:false },
  { date:"2026-08-17", merchant:"BookMyShow",          category:"Entertainment", amount:480,   type:"expense", recurring:false },
  { date:"2026-08-23", merchant:"Steam Gaming",        category:"Entertainment", amount:399,   type:"expense", recurring:false },

  // DINING OUT
  { date:"2026-08-10", merchant:"Cafe Coffee Day",     category:"Food",          amount:340,   type:"expense", recurring:false },
  { date:"2026-08-15", merchant:"McDonald's",          category:"Food",          amount:280,   type:"expense", recurring:false },
  { date:"2026-08-21", merchant:"Starbucks",           category:"Food",          amount:420,   type:"expense", recurring:false },

  // HEALTH & EDUCATION
  { date:"2026-08-09", merchant:"Apollo Pharmacy",     category:"Health",        amount:380,   type:"expense", recurring:false },
  { date:"2026-08-11", merchant:"Udemy Course",        category:"Education",     amount:499,   type:"expense", recurring:false },
];

// Previous month baselines for spike detection
const PREV_SHOPPING       = 2600;
const PREV_FOOD_DELIVERY  = 3800;

let transactions = [...DEMO_TRANSACTIONS];
let charts = {};

// ─── ANALYSIS ENGINE ──────────────────────────────────────────────────────────

function calculateIncome() {
  return transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
}

function calculateExpenses() {
  return transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
}

function calculateBalance() {
  return calculateIncome() - calculateExpenses();
}

function calculateCategoryTotals() {
  const totals = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return totals;
}

function detectRecurringPayments() {
  return transactions.filter(t => t.type === "expense" && t.recurring);
}

function detectExpenseLeaks(income, catTotals) {
  const rules = [
    { key:"Food Delivery", label:"Food Delivery", threshold:0.08, savePct:0.25, icon:"🍔", color:"#ef4444" },
    { key:"Shopping",      label:"Shopping",      threshold:0.10, savePct:0.22, icon:"🛍️", color:"#f59e0b" },
    { key:"Subscription",  label:"Subscriptions", threshold:0.05, savePct:0.40, icon:"📱", color:"#6366f1" },
    { key:"Entertainment", label:"Entertainment", threshold:0.05, savePct:0.33, icon:"🎬", color:"#22d3ee" },
    { key:"Transport",     label:"Transport",     threshold:0.06, savePct:0.20, icon:"🚗", color:"#10b981" },
    { key:"Food",          label:"Dining Out",    threshold:0.05, savePct:0.30, icon:"🍽️", color:"#f97316" },
    { key:"Groceries",     label:"Groceries",     threshold:0.12, savePct:0.15, icon:"🛒", color:"#8b5cf6" },
  ];
  return rules
    .map(r => {
      const spent = catTotals[r.key] || 0;
      if (!spent) return null;
      const pct = income > 0 ? (spent / income) * 100 : 0;
      const severity = pct > r.threshold * 200 ? "HIGH" : pct > r.threshold * 100 ? "MEDIUM" : "LOW";
      const potential = Math.round(spent * r.savePct);
      return { ...r, spent, pct, severity, potential };
    })
    .filter(Boolean)
    .sort((a, b) => b.spent - a.spent);
}

function detectSpendingSpikes(catTotals) {
  const spikes = [];
  const checks = [
    { key:"Shopping",      prev:PREV_SHOPPING,      threshold:0.30 },
    { key:"Food Delivery", prev:PREV_FOOD_DELIVERY, threshold:0.15 },
  ];
  checks.forEach(c => {
    const current = catTotals[c.key] || 0;
    if (current > c.prev && (current - c.prev) / c.prev > c.threshold) {
      spikes.push({
        category: c.key,
        previous: c.prev,
        current,
        increase: current - c.prev,
        pctIncrease: Math.round(((current - c.prev) / c.prev) * 100)
      });
    }
  });
  return spikes;
}

function calculatePotentialSavings(leaks) {
  return leaks.reduce((s, l) => s + l.potential, 0);
}

function calculateFinancialHealth(income, expenses, recurringTotal, potentialSavings, spikes) {
  if (!income) return 50;
  let score = 100;
  const savingsRate = (income - expenses) / income;
  const expenseRatio = expenses / income;
  // Savings rate factor
  if (savingsRate < 0.05) score -= 35;
  else if (savingsRate < 0.10) score -= 25;
  else if (savingsRate < 0.20) score -= 15;
  else if (savingsRate < 0.30) score -= 5;
  // Expense ratio factor
  if (expenseRatio > 0.95) score -= 25;
  else if (expenseRatio > 0.85) score -= 15;
  else if (expenseRatio > 0.75) score -= 8;
  // Recurring factor
  const recurRatio = recurringTotal / income;
  if (recurRatio > 0.20) score -= 12;
  else if (recurRatio > 0.12) score -= 6;
  // Savings opportunity
  const oppRatio = potentialSavings / income;
  if (oppRatio > 0.15) score -= 8;
  else if (oppRatio > 0.08) score -= 3;
  // Spikes
  score -= spikes.length * 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthStatus(score) {
  if (score >= 90) return { label:"Excellent",       color:"#10b981" };
  if (score >= 75) return { label:"Very Good",       color:"#6366f1" };
  if (score >= 60) return { label:"Good",            color:"#3b82f6" };
  if (score >= 40) return { label:"Needs Attention", color:"#f59e0b" };
  return               { label:"Critical",         color:"#ef4444" };
}

function generateRecommendations(income, leaks, recurring, spikes, potentialSavings) {
  const recs = [];
  leaks.forEach(l => {
    if (l.severity === "HIGH") {
      recs.push({
        icon:"bi bi-exclamation-triangle-fill", bg:"rgba(239,68,68,0.1)", color:"#ef4444",
        title:`High ${l.label} Spending Detected`,
        desc:`You spent ${fmt(l.spent)} on ${l.label} this month (${l.pct.toFixed(1)}% of income). Cutting by ${Math.round(l.savePct*100)}% could save ${fmt(l.potential)}/month.`
      });
    } else if (l.severity === "MEDIUM") {
      recs.push({
        icon:"bi bi-info-circle-fill", bg:"rgba(245,158,11,0.1)", color:"#f59e0b",
        title:`Reduce ${l.label} Spending`,
        desc:`${l.label} is ${l.pct.toFixed(1)}% of your income. A ${Math.round(l.savePct*100)}% reduction saves ${fmt(l.potential)}/month.`
      });
    }
  });
  if (recurring.length > 0) {
    const total = recurring.reduce((s, r) => s + r.amount, 0);
    recs.push({
      icon:"bi bi-repeat", bg:"rgba(99,102,241,0.1)", color:"#6366f1",
      title:`Review ${recurring.length} Recurring Subscriptions`,
      desc:`You pay ${fmt(total)}/month in recurring charges. Cancelling unused ones could save up to ${fmt(Math.round(total * 0.4))}/month.`
    });
  }
  spikes.forEach(sp => {
    recs.push({
      icon:"bi bi-graph-up-arrow", bg:"rgba(245,158,11,0.1)", color:"#f59e0b",
      title:`Spending Spike in ${sp.category}`,
      desc:`${sp.category} jumped ${sp.pctIncrease}% vs last month (${fmt(sp.previous)} → ${fmt(sp.current)}). Set a monthly budget to avoid repeat spikes.`
    });
  });
  if (potentialSavings > 0) {
    recs.push({
      icon:"bi bi-stars", bg:"rgba(16,185,129,0.1)", color:"#10b981",
      title:"Your Total Savings Opportunity",
      desc:`Following these recommendations could save you ${fmt(potentialSavings)}/month — that's ${fmt(potentialSavings * 12)} per year!`
    });
  }
  return recs;
}

function generateSavingsPlan(income, expenses, leaks) {
  const monthly = leaks.reduce((s, l) => s + l.potential, 0);
  return {
    current: expenses,
    recommended: Math.max(0, expenses - monthly),
    monthly,
    annual: monthly * 12,
    breakdown: leaks.filter(l => l.potential > 0).map(l => ({
      cat: l.label,
      save: l.potential,
      pct: l.spent > 0 ? Math.round((l.potential / l.spent) * 100) : 0
    }))
  };
}

// ─── FORMAT HELPER ────────────────────────────────────────────────────────────

function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// ─── RENDER: SUMMARY CARDS ───────────────────────────────────────────────────

function updateSummaryCards(income, expenses, savings, health) {
  document.getElementById("summaryIncome").textContent   = fmt(income);
  document.getElementById("summaryExpenses").textContent = fmt(expenses);
  document.getElementById("summarySavings").textContent  = fmt(savings) + "/mo";
  document.getElementById("summaryHealth").textContent   = health + "/100";
  // Hero bar
  document.getElementById("heroSavingsVal").textContent  = fmt(savings);
  document.getElementById("heroScoreVal").textContent    = health + "/100";
  document.getElementById("heroRingScore").textContent   = health;
}

// ─── RENDER: HEALTH SECTION ──────────────────────────────────────────────────

function updateHealthSection(income, expenses, recurTotal, savings, health, leaks, spikes) {
  const st = getHealthStatus(health);
  document.getElementById("healthScore").textContent   = health;
  document.getElementById("healthStatus").textContent  = st.label;
  document.getElementById("healthStatus").style.color  = st.color;

  // SVG circle
  const circumference = 502;
  const offset = circumference - (circumference * health / 100);
  document.getElementById("healthCircle").style.strokeDashoffset = offset;

  const savingsRate  = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : "0.0";
  const expenseRatio = income > 0 ? (expenses / income * 100).toFixed(1) : "0.0";

  document.getElementById("savingsRate").textContent    = savingsRate + "%";
  document.getElementById("expenseRatio").textContent   = expenseRatio + "%";
  document.getElementById("recurringTotal").textContent = fmt(recurTotal);
  document.getElementById("potentialSavings").textContent = fmt(savings);
  document.getElementById("heroRecurVal").textContent   = fmt(recurTotal);

  // Insight text
  let insight = `Your financial health is <strong>${st.label.toLowerCase()}</strong> with a score of ${health}/100. `;
  if (leaks.length > 0) insight += `${leaks[0].label} (${fmt(leaks[0].spent)}) is your biggest spending category. `;
  if (spikes.length > 0) insight += `A spending spike was detected in ${spikes[0].category}. `;
  insight += `Optimizing key categories could free up ${fmt(savings)}/month.`;
  document.getElementById("healthInsightText").innerHTML = insight;

  // Tips
  const tips = [
    parseFloat(savingsRate) < 20 ? "🎯 Aim for 20%+ savings rate" : "✅ Savings rate looks healthy",
    parseFloat(expenseRatio) > 75 ? "⚠️ Expenses above 75% of income" : "✅ Expense ratio is under control",
    `🔄 ${fmt(recurTotal)} locked in recurring payments`,
  ];
  document.getElementById("healthTips").innerHTML = tips.map(t => `<div class="hi-tip">${t}</div>`).join("");
}

// ─── RENDER: AI CARDS ────────────────────────────────────────────────────────

function renderAICards(leaks, recurring, spikes) {
  const container = document.getElementById("aiCards");
  const cards = [];

  // Card 1: top leak
  if (leaks.length > 0) {
    const l = leaks[0];
    cards.push(`
      <div class="col-lg-4">
        <div class="ai-insight-card">
          <div class="ai-tag ai-tag-red">🔴 High Impact</div>
          <div class="ai-card-title">${l.label}</div>
          <div class="ai-card-amount">${fmt(l.spent)}/month</div>
          <div class="ai-card-desc">You are spending a significant amount on ${l.label.toLowerCase()}. This is ${l.pct.toFixed(1)}% of your monthly income — above the recommended threshold.</div>
          <div class="ai-saving-row">
            <span class="ai-saving-label">Potential Savings</span>
            <span class="ai-saving-val">${fmt(l.potential)}/month</span>
          </div>
          <div class="ai-rec">💡 Reduce ${l.label.toLowerCase()} spending by ${Math.round(l.savePct * 100)}%.</div>
        </div>
      </div>`);
  }

  // Card 2: recurring
  if (recurring.length > 0) {
    const total = recurring.reduce((s, r) => s + r.amount, 0);
    cards.push(`
      <div class="col-lg-4">
        <div class="ai-insight-card">
          <div class="ai-tag ai-tag-blue">🔄 Recurring Leak</div>
          <div class="ai-card-title">${recurring.length} Subscriptions Detected</div>
          <div class="ai-card-amount">${fmt(total)}/month</div>
          <div class="ai-card-desc">We found ${recurring.length} recurring payments charged every month. Review these to make sure you are actively using all of them.</div>
          <div class="ai-saving-row">
            <span class="ai-saving-label">Yearly Drain</span>
            <span class="ai-saving-val">${fmt(total * 12)}/year</span>
          </div>
          <div class="ai-rec">💡 Review subscriptions you rarely use and cancel them.</div>
        </div>
      </div>`);
  }

  // Card 3: spike or total savings
  if (spikes.length > 0) {
    const sp = spikes[0];
    cards.push(`
      <div class="col-lg-4">
        <div class="ai-insight-card">
          <div class="ai-tag ai-tag-orange">📈 Unusual Spending</div>
          <div class="ai-card-title">${sp.category} Spike +${sp.pctIncrease}%</div>
          <div class="ai-card-amount">${fmt(sp.current)}/month</div>
          <div class="ai-card-desc">${sp.category} spending jumped vs last month. This suggests impulse purchases or a one-time event that may repeat.</div>
          <div class="ai-saving-row">
            <span class="ai-saving-label">Prev: ${fmt(sp.previous)} → Current: ${fmt(sp.current)}</span>
            <span class="ai-saving-val">+${fmt(sp.increase)}</span>
          </div>
          <div class="ai-rec">💡 Set a monthly ${sp.category.toLowerCase()} budget of ${fmt(sp.previous)}.</div>
        </div>
      </div>`);
  } else {
    const totalSavings = leaks.reduce((s, l) => s + l.potential, 0);
    cards.push(`
      <div class="col-lg-4">
        <div class="ai-insight-card">
          <div class="ai-tag ai-tag-blue">🎯 Savings Opportunity</div>
          <div class="ai-card-title">Total Savings Found</div>
          <div class="ai-card-amount">${fmt(totalSavings)}/month</div>
          <div class="ai-card-desc">We identified ${leaks.length} categories where smart cuts can significantly grow your monthly savings.</div>
          <div class="ai-saving-row">
            <span class="ai-saving-label">Annual Potential</span>
            <span class="ai-saving-val">${fmt(totalSavings * 12)}/year</span>
          </div>
          <div class="ai-rec">💡 Follow the personalized savings plan below.</div>
        </div>
      </div>`);
  }

  container.innerHTML = cards.join("");
}

// ─── RENDER: LEAK CARDS ──────────────────────────────────────────────────────

function renderLeakCards(leaks, income) {
  const container = document.getElementById("leakCards");
  if (!leaks.length) {
    container.innerHTML = `<div class="col-12 text-center text-muted py-4"><i class="bi bi-check-circle-fill text-success fs-1 d-block mb-2"></i>No significant expense leaks detected!</div>`;
    return;
  }
  const sevColor = { HIGH:"#ef4444", MEDIUM:"#f59e0b", LOW:"#10b981" };
  container.innerHTML = leaks.map(l => {
    const pctBar = Math.min(100, Math.round(l.pct * 5));
    const sev = l.severity === "HIGH" ? "sev-high" : l.severity === "MEDIUM" ? "sev-medium" : "sev-low";
    return `
    <div class="col-sm-6 col-xl-4">
      <div class="leak-card" onclick="showLeakModal('${l.label}',${l.spent},${l.pct.toFixed(1)},'${l.severity}',${l.potential},${Math.round(l.savePct*100)})" role="button" aria-label="View ${l.label} details">
        <div class="leak-header">
          <div class="leak-icon" style="background:${sevColor[l.severity]}1a">
            <span>${l.icon}</span>
          </div>
          <div>
            <div class="leak-cat">${l.label}</div>
            <span class="severity-badge ${sev}">${l.severity} IMPACT</span>
          </div>
        </div>
        <div class="leak-amount">${fmt(l.spent)}</div>
        <div class="leak-pct">${l.pct.toFixed(1)}% of monthly income</div>
        <div class="progress mb-2">
          <div class="progress-bar" role="progressbar" style="width:${pctBar}%;background:${sevColor[l.severity]}" aria-valuenow="${pctBar}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span style="font-size:0.78rem;color:#64748b">Potential Savings</span>
          <span style="font-size:0.9rem;font-weight:700;color:#10b981">${fmt(l.potential)}</span>
        </div>
        <div class="leak-rec">💡 Reduce by ${Math.round(l.savePct*100)}% to save ${fmt(l.potential)}/month</div>
      </div>
    </div>`;
  }).join("");
}

// ─── RENDER: RECURRING CARDS ─────────────────────────────────────────────────

function renderRecurringCards(recurring) {
  const icons = {
    "Netflix":"🎬","Spotify":"🎵","Amazon Prime":"📦","Hotstar":"📺",
    "Cult.fit Gym":"💪","House Rent":"🏠","BESCOM Electricity":"⚡",
    "ACT Fibernet":"🌐","Jio Mobile":"📱"
  };
  document.getElementById("recurringCards").innerHTML = recurring.map(r => `
    <div class="col-sm-6 col-lg-4">
      <div class="recurring-card">
        <div class="rc-icon">${icons[r.merchant] || "🔄"}</div>
        <div class="flex-grow-1">
          <div class="rc-name">${r.merchant}</div>
          <div class="rc-freq">Monthly • Recurring</div>
        </div>
        <div class="text-end">
          <div class="rc-amount">${fmt(r.amount)}/mo</div>
          <button class="btn-review mt-1" onclick="showSubModal('${r.merchant}',${r.amount},'${r.category}')" aria-label="Review ${r.merchant} subscription">Review</button>
        </div>
      </div>
    </div>`).join("");
}

// ─── RENDER: SAVINGS PLAN ────────────────────────────────────────────────────

function renderSavingsPlan(plan) {
  document.getElementById("spCurrentExp").textContent  = fmt(plan.current);
  document.getElementById("spRecommended").textContent = fmt(plan.recommended);
  document.getElementById("spMonthlySave").textContent = fmt(plan.monthly);
  document.getElementById("spAnnualSave").textContent  = fmt(plan.annual);

  const colors = ["#6366f1","#ef4444","#f59e0b","#22d3ee","#10b981","#f97316"];
  document.getElementById("savingsBars").innerHTML = plan.breakdown.slice(0, 6).map((b, i) => `
    <div class="savings-bar-row">
      <div class="sb-header">
        <span class="sb-cat">${b.cat}</span>
        <span class="sb-save">Save ${fmt(b.save)}/mo</span>
      </div>
      <div class="progress">
        <div class="progress-bar" role="progressbar" style="width:${b.pct}%;background:${colors[i % colors.length]}" aria-valuenow="${b.pct}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <div style="font-size:0.75rem;color:#94a3b8;margin-top:0.25rem">${b.pct}% reduction target</div>
    </div>`).join("");
}

// ─── RENDER: RECOMMENDATIONS ─────────────────────────────────────────────────

function renderRecommendations(recs) {
  document.getElementById("recommendationCards").innerHTML = recs.map(r => `
    <div class="col-sm-6 col-lg-4">
      <div class="rec-card">
        <div class="rec-icon" style="background:${r.bg}">
          <i class="${r.icon}" style="color:${r.color}"></i>
        </div>
        <div>
          <div class="rec-title">${r.title}</div>
          <div class="rec-desc">${r.desc}</div>
        </div>
      </div>
    </div>`).join("");
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#6366f1","#ef4444","#f59e0b","#22d3ee","#10b981","#f97316","#8b5cf6"];

function destroyCharts() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  charts = {};
}

function renderCharts(catTotals, income, expenses) {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js is not available.");
    return;
  }
  destroyCharts();
  const catLabels = Object.keys(catTotals);
  const catValues = Object.values(catTotals);
  const months    = ["Mar","Apr","May","Jun","Jul","Aug"];
  const trendData = [0.78, 0.85, 0.91, 0.88, 0.95, 1].map(f => Math.round(expenses * f));

  // 1. Doughnut
  charts.donut = new Chart(document.getElementById("donutChart"), {
    type: "doughnut",
    data: {
      labels: catLabels,
      datasets: [{ data: catValues, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: "#fff", hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12, boxWidth: 12 } } }
    }
  });

  // 2. Line
  charts.line = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Total Expenses",
        data: trendData,
        borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)",
        fill: true, tension: 0.4, pointBackgroundColor: "#6366f1", pointRadius: 5, borderWidth: 2.5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => "₹" + v.toLocaleString("en-IN"), font: { size: 11 } }, grid: { color: "#f1f5f9" } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  // 3. Bar — Income vs Expenses
  charts.bar = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        { label: "Income",   data: months.map(() => income),  backgroundColor: "rgba(16,185,129,0.7)", borderRadius: 6, borderSkipped: false },
        { label: "Expenses", data: trendData,                 backgroundColor: "rgba(99,102,241,0.7)", borderRadius: 6, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } } },
      scales: {
        y: { ticks: { callback: v => "₹" + v.toLocaleString("en-IN"), font: { size: 11 } }, grid: { color: "#f1f5f9" } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  // 4. Horizontal Bar
  const sorted = catLabels.map((l, i) => ({ l, v: catValues[i] })).sort((a, b) => b.v - a.v).slice(0, 7);
  charts.hbar = new Chart(document.getElementById("hbarChart"), {
    type: "bar",
    data: {
      labels: sorted.map(d => d.l),
      datasets: [{ label: "Spent", data: sorted.map(d => d.v), backgroundColor: CHART_COLORS.slice(0, sorted.length), borderRadius: 5, borderSkipped: false }]
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { callback: v => "₹" + v.toLocaleString("en-IN"), font: { size: 11 } }, grid: { color: "#f1f5f9" } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ─── TRANSACTIONS TABLE ───────────────────────────────────────────────────────

function populateCategoryFilter() {
  const cats = [...new Set(transactions.map(t => t.category))].sort();
  const sel = document.getElementById("txnCategory");
  const cur = sel.value;
  sel.innerHTML = `<option value="">All Categories</option>` +
    cats.map(c => `<option value="${c}" ${c === cur ? "selected" : ""}>${c}</option>`).join("");
}

function filterTransactions() {
  const search   = document.getElementById("txnSearch").value.toLowerCase();
  const category = document.getElementById("txnCategory").value;
  const type     = document.getElementById("txnType").value;
  const sort     = document.getElementById("txnSort").value;

  let filtered = transactions.filter(t => {
    const ms = !search   || t.merchant.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
    const mc = !category || t.category === category;
    const mt = !type     || t.type === type;
    return ms && mc && mt;
  });

  filtered.sort((a, b) => {
    if (sort === "newest")  return new Date(b.date) - new Date(a.date);
    if (sort === "oldest")  return new Date(a.date) - new Date(b.date);
    if (sort === "highest") return b.amount - a.amount;
    if (sort === "lowest")  return a.amount - b.amount;
    return 0;
  });

  renderTransactionTable(filtered);
  document.getElementById("txnCount").textContent =
    `Showing ${filtered.length} of ${transactions.length} transactions`;
}

function renderTransactionTable(data) {
  const tbody = document.getElementById("txnTableBody");
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">
      <i class="bi bi-inbox fs-2 d-block mb-1"></i>No transactions found</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(t => {
    const sign      = t.type === "income" ? "+" : "-";
    const amtClass  = t.type === "income" ? "txn-amount-income" : "txn-amount-expense";
    const typeBadge = t.type === "income"
      ? `<span class="badge-income">Income</span>`
      : `<span class="badge-expense">Expense</span>`;
    const recBadge  = t.recurring
      ? `<span class="badge-recurring"><i class="bi bi-repeat me-1"></i>Yes</span>`
      : `<span style="color:#94a3b8;font-size:0.78rem">—</span>`;
    const dateStr = new Date(t.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
    return `<tr>
      <td>${dateStr}</td>
      <td><strong>${t.merchant}</strong></td>
      <td><span style="background:#f1f5f9;padding:0.15rem 0.6rem;border-radius:1rem;font-size:0.75rem;font-weight:600">${t.category}</span></td>
      <td class="${amtClass}">${sign}${fmt(t.amount)}</td>
      <td>${typeBadge}</td>
      <td>${recBadge}</td>
    </tr>`;
  }).join("");
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function showSubModal(merchant, amount, category) {
  const yearly = amount * 12;
  document.getElementById("subModalBody").innerHTML = `
    <div class="modal-stat-row"><span class="modal-stat-label">Merchant</span><strong class="modal-stat-val">${merchant}</strong></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Category</span><span class="modal-stat-val">${category}</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Monthly Cost</span><span class="modal-stat-val text-danger">${fmt(amount)}</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Frequency</span><span class="modal-stat-val">Monthly (Recurring)</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Yearly Cost</span><span class="modal-stat-val text-danger">${fmt(yearly)}</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Why Detected</span><span class="modal-stat-val">Same amount charged every month</span></div>
    <hr/>
    <div class="alert alert-warning py-2 mb-0">
      <i class="bi bi-lightbulb-fill me-2"></i>
      If you use this less than 4×/month, cancelling saves ${fmt(yearly)}/year.
    </div>`;
  new bootstrap.Modal(document.getElementById("subModal")).show();
  showToast(`Reviewing ${merchant} subscription`, "primary");
}

function showLeakModal(label, spent, pct, severity, potential, savePct) {
  const sevColor = severity === "HIGH" ? "#ef4444" : severity === "MEDIUM" ? "#f59e0b" : "#10b981";
  document.getElementById("leakModalBody").innerHTML = `
    <div class="modal-stat-row"><span class="modal-stat-label">Category</span><strong class="modal-stat-val">${label}</strong></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Monthly Spend</span><span class="modal-stat-val text-danger">${fmt(spent)}</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">% of Income</span><span class="modal-stat-val">${pct}%</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Severity</span><span class="modal-stat-val" style="color:${sevColor}">${severity} IMPACT</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Potential Savings</span><span class="modal-stat-val text-success">${fmt(potential)}/month</span></div>
    <div class="modal-stat-row"><span class="modal-stat-label">Annual Savings</span><span class="modal-stat-val text-success">${fmt(potential * 12)}/year</span></div>
    <hr/>
    <div class="alert alert-success py-2 mb-0">
      <i class="bi bi-check-circle-fill me-2"></i>
      Reducing ${label.toLowerCase()} by ${savePct}% saves ${fmt(potential)} every month!
    </div>`;
  new bootstrap.Modal(document.getElementById("leakModal")).show();
}

function showSavingsModal() {
  const income   = calculateIncome();
  const expenses = calculateExpenses();
  const leaks    = detectExpenseLeaks(income, calculateCategoryTotals());
  const plan     = generateSavingsPlan(income, expenses, leaks);
  const colors   = ["#6366f1","#ef4444","#f59e0b","#22d3ee","#10b981","#f97316"];
  document.getElementById("savingsModalBody").innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-6"><div class="p-3 rounded" style="background:#fff5f5;border:1px solid #fecaca">
        <div style="font-size:0.75rem;color:#64748b">Current Expenses</div>
        <div style="font-size:1.2rem;font-weight:800;color:#ef4444">${fmt(plan.current)}</div>
      </div></div>
      <div class="col-6"><div class="p-3 rounded" style="background:#f0f0ff;border:1px solid #c7d2fe">
        <div style="font-size:0.75rem;color:#64748b">Recommended</div>
        <div style="font-size:1.2rem;font-weight:800;color:#6366f1">${fmt(plan.recommended)}</div>
      </div></div>
      <div class="col-6"><div class="p-3 rounded" style="background:#f0fdf4;border:1px solid #bbf7d0">
        <div style="font-size:0.75rem;color:#64748b">Monthly Savings</div>
        <div style="font-size:1.2rem;font-weight:800;color:#10b981">${fmt(plan.monthly)}</div>
      </div></div>
      <div class="col-6"><div class="p-3 rounded" style="background:#f0fdf4;border:1px solid #bbf7d0">
        <div style="font-size:0.75rem;color:#64748b">Annual Savings</div>
        <div style="font-size:1.2rem;font-weight:800;color:#10b981">${fmt(plan.annual)}</div>
      </div></div>
    </div>
    <h6 class="fw-bold mb-3">Category-wise Savings Targets</h6>
    ${plan.breakdown.map((b, i) => `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span style="font-size:0.85rem;font-weight:600">${b.cat}</span>
          <span style="font-size:0.85rem;color:#10b981;font-weight:700">Save ${fmt(b.save)}/mo</span>
        </div>
        <div class="progress" style="height:7px">
          <div class="progress-bar" style="width:${b.pct}%;background:${colors[i % colors.length]}"></div>
        </div>
        <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px">${b.pct}% reduction target</div>
      </div>`).join("")}
    <div class="alert alert-success mt-3 mb-0 py-2">
      <i class="bi bi-stars me-2"></i>
      <strong>Annual Savings Potential: ${fmt(plan.annual)}</strong> — start with one category at a time!
    </div>`;
  new bootstrap.Modal(document.getElementById("savingsModal")).show();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function showToast(msg, type = "success") {
  const el = document.getElementById("appToast");
  el.className = `toast align-items-center text-white border-0 bg-${type}`;
  document.getElementById("toastMsg").textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}

// ─── CSV UPLOAD ───────────────────────────────────────────────────────────────

function handleCSVUpload() {
  const file    = document.getElementById("csvFile").files[0];
  const alertEl = document.getElementById("importAlert");
  if (!file) {
    alertEl.innerHTML = `<div class="alert alert-danger py-2"><i class="bi bi-x-circle me-2"></i>Please select a CSV file first.</div>`;
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const lines   = e.target.result.trim().split("\n");
      const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
      const required = ["date","merchant","category","amount","type","recurring"];
      const missing  = required.filter(r => !headers.includes(r));
      if (missing.length) {
        alertEl.innerHTML = `<div class="alert alert-danger py-2"><i class="bi bi-x-circle me-2"></i>Missing columns: ${missing.join(", ")}</div>`;
        return;
      }
      const parsed = []; let errors = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim(); if (!line) continue;
        const cols = line.split(",");
        const row  = {};
        headers.forEach((h, idx) => row[h] = (cols[idx] || "").trim());
        const amount = parseFloat(row.amount);
        if (!row.date || !row.merchant || isNaN(amount)) { errors++; continue; }
        parsed.push({
          date: row.date, merchant: row.merchant,
          category: row.category || "Other",
          amount: Math.abs(amount),
          type: row.type === "income" ? "income" : "expense",
          recurring: row.recurring === "true" || row.recurring === "1"
        });
      }
      if (!parsed.length) {
        alertEl.innerHTML = `<div class="alert alert-danger py-2"><i class="bi bi-x-circle me-2"></i>No valid rows found in CSV.</div>`;
        return;
      }
      transactions = parsed;
      alertEl.innerHTML = `<div class="alert alert-success py-2"><i class="bi bi-check-circle me-2"></i>Imported ${parsed.length} transactions successfully. ${errors ? `(${errors} skipped)` : ""}</div>`;
      bootstrap.Modal.getInstance(document.getElementById("importModal"))?.hide();
      runAnalysis();
      showToast(`${parsed.length} transactions imported & analyzed!`, "success");
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-danger py-2"><i class="bi bi-x-circle me-2"></i>Parse error: ${err.message}</div>`;
    }
  };
  reader.readAsText(file);
}

function loadDemoData() {
  transactions = [...DEMO_TRANSACTIONS];
  bootstrap.Modal.getInstance(document.getElementById("importModal"))?.hide();
  runAnalysis();
  showToast("Demo data loaded & analyzed!", "success");
}

// ─── MAIN RUNNER ─────────────────────────────────────────────────────────────

function runAnalysis() {
  const income     = calculateIncome();
  const expenses   = calculateExpenses();
  const catTotals  = calculateCategoryTotals();
  const recurring  = detectRecurringPayments();
  const leaks      = detectExpenseLeaks(income, catTotals);
  const spikes     = detectSpendingSpikes(catTotals);
  const savings    = calculatePotentialSavings(leaks);
  const recurTotal = recurring.reduce((s, r) => s + r.amount, 0);
  const health     = calculateFinancialHealth(income, expenses, recurTotal, savings, spikes);
  const recs       = generateRecommendations(income, leaks, recurring, spikes, savings);
  const plan       = generateSavingsPlan(income, expenses, leaks);

  updateSummaryCards(income, expenses, savings, health);
  updateHealthSection(income, expenses, recurTotal, savings, health, leaks, spikes);
  renderAICards(leaks, recurring, spikes);
  renderLeakCards(leaks, income);
  renderRecurringCards(recurring);
  renderCharts(catTotals, income, expenses);
  renderSavingsPlan(plan);
  renderRecommendations(recs);
  populateCategoryFilter();
  filterTransactions();

  document.getElementById("heroLeaksVal").textContent = leaks.filter(l => l.severity === "HIGH").length + " Found";
}

// ─── ANALYZE WITH LOADING ANIMATION ─────────────────────────────────────────

function triggerAnalysis() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("d-none");
  setTimeout(() => {
    try {
      runAnalysis();
    } catch (err) {
      console.error("Analysis execution error:", err);
    } finally {
      if (overlay) overlay.classList.add("d-none");
      showToast("Expense analysis completed successfully!", "success");
    }
  }, 1300);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  try {
    runAnalysis();
  } catch (err) {
    console.error("Initial analysis error:", err);
  } finally {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("d-none");
  }
});