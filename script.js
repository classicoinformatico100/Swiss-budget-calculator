const cantons = {
    zurich: { tax: 0.10, ahv: 0.053, alv: 0.011, pension: 0.075, color: 'linear-gradient(135deg, #eff6ff 0%, #1d4ed8 100%)' },
    geneva: { tax: 0.12, ahv: 0.053, alv: 0.011, pension: 0.08, color: 'linear-gradient(135deg, #e0f2fe 0%, #3b82f6 100%)' },
    bern: { tax: 0.11, ahv: 0.053, alv: 0.011, pension: 0.07, color: 'linear-gradient(135deg, #fef2f2 0%, #dc2626 100%)' },
    vaud: { tax: 0.115, ahv: 0.053, alv: 0.011, pension: 0.075, color: 'linear-gradient(135deg, #f0fdf4 0%, #166534 100%)' },
    valais: { tax: 0.095, ahv: 0.053, alv: 0.011, pension: 0.065, color: 'linear-gradient(135deg, #fffbeb 0%, #d97706 100%)' }
};

let currentMode = 'monthly';
let budgetChart;

document.addEventListener('DOMContentLoaded', () => {
    initChartEngine();
    setupEventListeners();
    updateUIEngine();
});

function setupEventListeners() {
    
    document.getElementById('path-monthly').addEventListener('click', () => { currentMode = 'monthly'; togglePathUI(); updateUIEngine(); });
    document.getElementById('path-yearly').addEventListener('click', () => { currentMode = 'yearly'; togglePathUI(); updateUIEngine(); });

    
    const inputs = [
        'gross-salary', 'canton-selector', 'thirteenth-toggle', 'exp-rent', 'exp-health', 
        'exp-car-tax', 'exp-food', 'exp-serafe', 'exp-net', 'exp-hobby', 'vault-input', 'goal-amount'
    ];
    
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            updateUIEngine();
        });
    });

    
    document.getElementById('analyze-btn').addEventListener('click', runAIHealthCheck);
    document.getElementById('pdf-export').addEventListener('click', exportProfessionalPDF);
}

function togglePathUI() {
    document.getElementById('path-monthly').classList.toggle('active', currentMode === 'monthly');
    document.getElementById('path-yearly').classList.toggle('active', currentMode === 'yearly');
    document.getElementById('income-label').innerText = currentMode === 'monthly' ? "Monthly Gross Income (CHF)" : "Yearly Gross Income (CHF)";
}

function updateUIEngine() {
    const gross = parseFloat(document.getElementById('gross-salary').value) || 0;
    const cantonKey = document.getElementById('canton-selector').value;
    const is13th = document.getElementById('thirteenth-toggle').checked;
    const config = cantons[cantonKey];

    
    document.body.style.background = config.color;

    
    let monthlyGross = currentMode === 'yearly' ? (is13th ? gross / 13 : gross / 12) : gross;

    
    const ded = {
        ahv: monthlyGross * config.ahv,
        alv: monthlyGross * config.alv,
        pension: monthlyGross * config.pension,
        tax: monthlyGross * config.tax
    };

    const totalDed = Object.values(ded).reduce((a, b) => a + b, 0);
    const netSalary = monthlyGross - totalDed;

    
    const expIds = ['exp-rent', 'exp-health', 'exp-car-tax', 'exp-food', 'exp-serafe', 'exp-net', 'exp-hobby'];
    const totalExp = expIds.reduce((sum, id) => sum + (parseFloat(document.getElementById(id).value) || 0), 0);

    const disposable = netSalary - totalExp;

    
    document.getElementById('val-ahv').innerText = Math.round(ded.ahv) + " CHF";
    document.getElementById('val-alv').innerText = Math.round(ded.alv) + " CHF";
    document.getElementById('val-pension').innerText = Math.round(ded.pension) + " CHF";
    document.getElementById('val-tax').innerText = Math.round(ded.tax) + " CHF";
    document.getElementById('disposable-val').innerText = Math.round(disposable).toLocaleString();

    renderSummaryList(totalDed, totalExp, disposable);
    updateChartData(totalDed, totalExp, disposable);
    updateVaultLogic(disposable);
}

function renderSummaryList(tax, exp, net) {
    const container = document.getElementById('numeric-summary');
    container.innerHTML = `
        <div class="summary-item"><span>State/Taxes:</span> <b>-${Math.round(tax)} CHF</b></div>
        <div class="summary-item"><span>Total Expenses:</span> <b>-${Math.round(exp)} CHF</b></div>
        <div class="summary-item" style="border-left-color: #10B981"><span>Net Surplus:</span> <b style="color:#10B981">${Math.round(net)} CHF</b></div>
    `;
}

function runAIHealthCheck() {
    const gross = parseFloat(document.getElementById('gross-salary').value) || 1;
    const disposable = parseFloat(document.getElementById('disposable-val').innerText.replace(/[^\d.-]/g, ''));
    const savingsRate = (disposable / (gross / 12)) * 100;
    
    let score = savingsRate > 30 ? 95 : (savingsRate > 15 ? 75 : 40);
    document.getElementById('health-score').innerText = score;
    document.getElementById('status-label').innerText = score > 80 ? "Excellent" : "Needs Review";
    document.getElementById('status-desc').innerText = score > 80 ? "Your budget is very sustainable for CH." : "Consider optimizing living costs.";
}

function updateVaultLogic(disposable) {
    const savings = parseFloat(document.getElementById('vault-input').value);
    const goal = parseFloat(document.getElementById('goal-amount').value) || 1;
    
    document.getElementById('vault-current-val').innerText = savings.toLocaleString();
    const progress = Math.min((savings / goal) * 100, 100);
    document.getElementById('goal-fill').style.width = progress + "%";
    document.getElementById('progress-percent').innerText = Math.round(progress) + "%";

   
    const rate = 0.08;
    [1, 5, 10].forEach(yrs => {
        const n = yrs * 12; const r = rate / 12;
        const fv = savings * (((Math.pow(1 + r, n)) - 1) / r);
        document.getElementById(`p-${yrs}`).innerText = Math.round(fv).toLocaleString() + " CHF";
    });
}

function initChartEngine() {
    const ctx = document.getElementById('financialChart').getContext('2d');
    budgetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Tax', 'Exp', 'Net'],
            datasets: [{ data: [0,0,0], backgroundColor: ['#D52B1E', '#0F172A', '#10B981'], borderWidth: 0, hoverOffset: 15 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function updateChartData(t, e, n) {
    budgetChart.data.datasets[0].data = [t, e, n > 0 ? n : 0];
    budgetChart.update();
}

function exportProfessionalPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const canton = document.getElementById('canton-selector').value.toUpperCase();
    
    
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(55);
    doc.text("SWISS BUDGET PRO", 35, 150, { angle: 45 });

    
    doc.setFillColor(213, 43, 30);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("SWISS BUDGET CALCULATOR", 20, 26);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text(`Canton Analysis: ${canton}`, 20, 60);
    doc.text(`Monthly Surplus: ${document.getElementById('disposable-val').innerText}`, 20, 75);
    
    doc.save(`Swiss_Budget_${canton}.pdf`);
}