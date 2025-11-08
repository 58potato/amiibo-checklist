let currentView = 'figures';
let amiiboStatesFigures = {};
let amiiboStatesCards = {};
let scrollPositions = { figures: 0, cards: 0 };
let collapsedSeries = { figures: {}, cards: {} };

function initStates() {
    const savedFigures = localStorage.getItem('amiiboStatesFigures');
    const savedCards = localStorage.getItem('amiiboStatesCards');
    const savedCollapsed = localStorage.getItem('collapsedSeries');

    if (savedFigures) amiiboStatesFigures = JSON.parse(savedFigures);
    if (savedCards) amiiboStatesCards = JSON.parse(savedCards);
    if (savedCollapsed) collapsedSeries = JSON.parse(savedCollapsed);

    [amiibo, amiiboCards].forEach((list, idx) => {
        const statesObj = idx === 0 ? amiiboStatesFigures : amiiboStatesCards;
        list.forEach(amiibo => {
            if (statesObj[amiibo.id] === undefined) statesObj[amiibo.id] = 0;
        });
    });

    localStorage.setItem('amiiboStatesFigures', JSON.stringify(amiiboStatesFigures));
    localStorage.setItem('amiiboStatesCards', JSON.stringify(amiiboStatesCards));
}

initStates();

const savedView = sessionStorage.getItem('currentView');
if (savedView === 'cards' || savedView === 'figures') currentView = savedView;

const savedScrollPos = sessionStorage.getItem('scrollPositions');
if (savedScrollPos) scrollPositions = JSON.parse(savedScrollPos);

function getCurrentData() {
    return currentView === 'figures'
        ? { series, amiibo, states: amiiboStatesFigures }
        : { series: cardSeries, amiibo: amiiboCards, states: amiiboStatesCards };
}

function getCounts(seriesId = null) {
    const data = getCurrentData();
    const items = seriesId ? data.amiibo.filter(a => a.series === seriesId) : data.amiibo;
    const unboxed = items.filter(a => data.states[a.id] === 1).length;
    const sealed = items.filter(a => data.states[a.id] === 2).length;
    return { unboxed, sealed, total: items.length };
}

function getSeriesCompletion(seriesId) {
    const data = getCurrentData();
    const items = data.amiibo.filter(a => a.series === seriesId);
    const allCollected = items.every(a => data.states[a.id] > 0);
    const allSealed = items.every(a => data.states[a.id] === 2);
    return { allCollected, allSealed };
}

function updateCounters() {
    const data = getCurrentData();

    data.series.forEach(seriesData => {
        const counterEl = document.getElementById(`counter-${seriesData.id}`);
        if (counterEl) {
            const { unboxed, sealed, total } = getCounts(seriesData.id);
            const { allCollected, allSealed } = getSeriesCompletion(seriesData.id);

            if (allCollected) {
                const starColor = allSealed ? 'gold' : 'green';
                counterEl.innerHTML = `<span class="completion-count ${starColor}">${unboxed + sealed} <span class="completion-star ${starColor}">★</span></span>`;
            } else {
                counterEl.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${unboxed + sealed}</span> / <strong>${total}</strong>`;
            }
        }
    });

    const overallCounter = document.getElementById('counter-overall');
    if (overallCounter) {
        const { unboxed, sealed, total } = getCounts();
        overallCounter.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${unboxed + sealed}</span> / <strong>${total}</strong>`;
    }
}

function cycleState(amiiboId) {
    const data = getCurrentData();
    data.states[amiiboId] = (data.states[amiiboId] + 1) % 3;

    const card = document.querySelector(`[data-amiibo-id="${amiiboId}"]`);
    if (card) card.className = `amiibo-card state-${data.states[amiiboId]}`;

    updateCounters();
    localStorage.setItem('amiiboStatesFigures', JSON.stringify(amiiboStatesFigures));
    localStorage.setItem('amiiboStatesCards', JSON.stringify(amiiboStatesCards));
}

function markAllInSeries(seriesId, state) {
    const data = getCurrentData();
    const amiiboSeries = data.amiibo.filter(a => a.series === seriesId);

    amiiboSeries.forEach(amiibo => {
        data.states[amiibo.id] = state;
        const card = document.querySelector(`[data-amiibo-id="${amiibo.id}"]`);
        if (card) card.className = `amiibo-card state-${state}`;
    });

    updateCounters();
    localStorage.setItem('amiiboStatesFigures', JSON.stringify(amiiboStatesFigures));
    localStorage.setItem('amiiboStatesCards', JSON.stringify(amiiboStatesCards));
}

function toggleSeriesCollapse(seriesId) {
    const currentCollapsed = collapsedSeries[currentView];
    currentCollapsed[seriesId] = !currentCollapsed[seriesId];
    localStorage.setItem('collapsedSeries', JSON.stringify(collapsedSeries));

    const cards = document.querySelectorAll(`[data-series-id="${seriesId}"]`);
    const arrow = document.querySelector(`[data-arrow-series="${seriesId}"]`);
    const header = arrow?.closest('.series-header-full');
    const buttonsContainer = header?.querySelector('.series-buttons');

    cards.forEach(card => card.style.display = currentCollapsed[seriesId] ? 'none' : 'block');
    if (arrow) arrow.classList.toggle('collapsed', currentCollapsed[seriesId]);
    if (header) header.classList.toggle('collapsed', currentCollapsed[seriesId]);
    if (buttonsContainer) buttonsContainer.style.display = currentCollapsed[seriesId] ? 'none' : 'flex';
}

function createAmiiboCard(amiibo) {
    const state = getCurrentData().states[amiibo.id];
    const imagePath = currentView === 'figures' ? 'figures' : 'cards';

    const card = document.createElement('div');
    card.className = `amiibo-card state-${state}`;
    card.setAttribute('data-amiibo-id', amiibo.id);
    card.setAttribute('data-series-id', amiibo.series);

    card.innerHTML = `
        <div class="image-container">
            <img src="images/${imagePath}/${amiibo.series}/${amiibo.id}.png" 
                 alt="${amiibo.name}">
            <div class="placeholder-image" style="display: none;">
                ${amiibo.name}
            </div>
        </div>
        <div class="amiibo-name">${amiibo.name}</div>
    `;

    const img = card.querySelector('img');
    const placeholder = card.querySelector('.placeholder-image');
    img.addEventListener('error', () => {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
    });

    card.addEventListener('click', (e) => {
        e.preventDefault();
        cycleState(amiibo.id);
    });

    return card;
}

function createSeriesHeader(seriesData) {
    const header = document.createElement('div');
    header.className = 'series-header-full';

    const { unboxed, sealed, total } = getCounts(seriesData.id);
    const { allCollected, allSealed } = getSeriesCompletion(seriesData.id);

    const title = document.createElement('h2');
    const headerContent = document.createElement('div');
    headerContent.className = 'series-header-content';

    const collapseArrow = document.createElement('span');
    collapseArrow.className = 'collapse-arrow';
    collapseArrow.style.borderLeftColor = seriesData.color;
    collapseArrow.setAttribute('data-arrow-series', seriesData.id);

    const isCollapsed = collapsedSeries[currentView][seriesData.id];
    if (isCollapsed) {
        collapseArrow.classList.add('collapsed');
        header.classList.add('collapsed');
    }

    const titleText = document.createElement('span');
    titleText.className = 'series-title';
    titleText.textContent = seriesData.name;

    const counter = document.createElement('span');
    counter.className = 'series-counter';
    counter.id = `counter-${seriesData.id}`;

    if (allCollected) {
        const starColor = allSealed ? 'gold' : 'green';
        counter.innerHTML = `<span class="completion-count ${starColor}">${unboxed + sealed} <span class="completion-star ${starColor}">★</span></span>`;
    } else {
        counter.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${unboxed + sealed}</span> / <strong>${total}</strong>`;
    }

    headerContent.appendChild(collapseArrow);
    headerContent.appendChild(titleText);
    headerContent.appendChild(counter);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'series-buttons';
    if (isCollapsed) buttonsContainer.style.display = 'none';

    const buttons = [
        { class: 'btn-not-owned', text: 'Mark all as Not Owned', state: 0 },
        { class: 'btn-unboxed', text: 'Mark all as Unboxed', state: 1 },
        { class: 'btn-sealed', text: 'Mark all as Sealed', state: 2 }
    ];

    buttons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.className = `series-btn ${btnConfig.class}`;
        btn.textContent = btnConfig.text;
        btn.onclick = (e) => {
            e.stopPropagation();
            markAllInSeries(seriesData.id, btnConfig.state);
        };
        buttonsContainer.appendChild(btn);
    });

    title.appendChild(headerContent);
    title.appendChild(buttonsContainer);
    title.style.cursor = 'pointer';
    title.addEventListener('click', (e) => {
        if (!e.target.closest('.series-buttons')) toggleSeriesCollapse(seriesData.id);
    });

    header.appendChild(title);
    return header;
}

function renderAmiibo() {
    const data = getCurrentData();
    const grid = document.getElementById('amiiboGrid');
    grid.innerHTML = '';

    data.series.forEach((seriesData, index) => {
        const amiiboSeries = data.amiibo.filter(a => a.series === seriesData.id);
        if (amiiboSeries.length > 0) {
            grid.appendChild(createSeriesHeader(seriesData));

            const isCollapsed = collapsedSeries[currentView][seriesData.id];

            amiiboSeries.forEach(amiibo => {
                const card = createAmiiboCard(amiibo);
                if (isCollapsed) card.style.display = 'none';
                grid.appendChild(card);
            });

            if (index < data.series.length - 1) {
                const spacer = document.createElement('div');
                spacer.className = 'series-spacer';
                grid.appendChild(spacer);
            }
        }
    });

    updateCounters();
}

function switchView(view) {
    scrollPositions[currentView] = window.scrollY;
    sessionStorage.setItem('scrollPositions', JSON.stringify(scrollPositions));

    currentView = view;
    sessionStorage.setItem('currentView', view);

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    renderAmiibo();
    setTimeout(() => window.scrollTo(0, scrollPositions[view]), 0);
}

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        switchView(this.dataset.view);
    });
});

renderAmiibo();

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
});

window.addEventListener('beforeunload', () => {
    scrollPositions[currentView] = window.scrollY;
    sessionStorage.setItem('scrollPositions', JSON.stringify(scrollPositions));
});

window.addEventListener('load', () => {
    window.scrollTo(0, scrollPositions[currentView]);
});

const scrollToTopBtn = document.getElementById('scrollToTopBtn');

function toggleScrollButton() {
    if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
}

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', toggleScrollButton);
toggleScrollButton();

function exportData() {
    const figuresData = {};
    const cardsData = {};

    Object.keys(amiiboStatesFigures).forEach(key => {
        if (amiiboStatesFigures[key] !== 0) figuresData[key] = amiiboStatesFigures[key];
    });

    Object.keys(amiiboStatesCards).forEach(key => {
        if (amiiboStatesCards[key] !== 0) cardsData[key] = amiiboStatesCards[key];
    });

    const exportObj = {
        version: '1.4',
        exportDate: new Date().toISOString(),
        figures: figuresData,
        cards: cardsData
    };

    return JSON.stringify(exportObj, null, 2);
}

function importData(jsonString) {
    try {
        const importObj = JSON.parse(jsonString);

        if (!importObj.version || !importObj.figures || !importObj.cards) {
            return { success: false, message: 'Invalid JSON format. Missing required fields.' };
        }

        const newFiguresStates = {};
        const newCardsStates = {};

        amiibo.forEach(a => newFiguresStates[a.id] = 0);
        amiiboCards.forEach(a => newCardsStates[a.id] = 0);

        Object.keys(importObj.figures).forEach(key => {
            if (newFiguresStates.hasOwnProperty(key)) {
                const state = parseInt(importObj.figures[key]);
                if (state >= 0 && state <= 2) newFiguresStates[key] = state;
            }
        });

        Object.keys(importObj.cards).forEach(key => {
            if (newCardsStates.hasOwnProperty(key)) {
                const state = parseInt(importObj.cards[key]);
                if (state >= 0 && state <= 2) newCardsStates[key] = state;
            }
        });

        amiiboStatesFigures = newFiguresStates;
        amiiboStatesCards = newCardsStates;
        localStorage.setItem('amiiboStatesFigures', JSON.stringify(amiiboStatesFigures));
        localStorage.setItem('amiiboStatesCards', JSON.stringify(amiiboStatesCards));
        renderAmiibo();

        return { success: true, message: 'Data imported successfully!' };
    } catch (error) {
        return { success: false, message: `Import failed: ${error.message}` };
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function showMessage(title, message, isSuccess = true, actions = []) {
    document.getElementById('messageTitle').textContent = title;

    const messageText = document.getElementById('messageText');
    messageText.textContent = message;
    messageText.className = isSuccess ? 'success-message' : 'error-message';

    const actionsContainer = document.getElementById('messageActions');
    actionsContainer.innerHTML = '';

    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `control-btn ${action.class || ''}`;
        btn.textContent = action.text;
        btn.onclick = action.onClick;
        actionsContainer.appendChild(btn);
    });

    openModal('messageModal');
}

document.getElementById('exportBtn').addEventListener('click', () => {
    document.getElementById('exportData').value = exportData();
    openModal('exportModal');
});

document.getElementById('copyBtn').addEventListener('click', () => {
    const textarea = document.getElementById('exportData');
    textarea.select();
    document.execCommand('copy');

    const btn = document.getElementById('copyBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = originalText, 2000);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const jsonData = document.getElementById('exportData').value;
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `amiibo-collection-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const result = importData(event.target.result);
        showMessage(
            result.success ? 'Import Successful' : 'Import Failed',
            result.message,
            result.success,
            [{
                text: 'OK',
                class: result.success ? 'copy-btn' : 'export-btn',
                onClick: () => closeModal('messageModal')
            }]
        );
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('show');
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
});