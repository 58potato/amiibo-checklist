let currentView = 'figures';
let amiiboStatesFigures = {};
let amiiboStatesCards = {};
let scrollPositions = { figures: 0, cards: 0 };

function initStates() {
    const savedFigures = localStorage.getItem('amiiboStatesFigures');
    const savedCards = localStorage.getItem('amiiboStatesCards');

    if (savedFigures) {
        amiiboStatesFigures = JSON.parse(savedFigures);
    }
    if (savedCards) {
        amiiboStatesCards = JSON.parse(savedCards);
    }

    [amiibos, amiiboCards].forEach((list, idx) => {
        const statesObj = idx === 0 ? amiiboStatesFigures : amiiboStatesCards;
        list.forEach(amiibo => {
            if (statesObj[amiibo.id] === undefined) {
                statesObj[amiibo.id] = 0;
            }
        });
    });
}

initStates();

const savedView = sessionStorage.getItem('currentView');
if (savedView === 'cards' || savedView === 'figures') {
    currentView = savedView;
}

const savedScrollPos = sessionStorage.getItem('scrollPositions');
if (savedScrollPos) {
    scrollPositions = JSON.parse(savedScrollPos);
}

function getCurrentData() {
    return currentView === 'figures'
        ? { series, amiibos, states: amiiboStatesFigures }
        : { series: cardSeries, amiibos: amiiboCards, states: amiiboStatesCards };
}

function getCounts(seriesId = null) {
    const data = getCurrentData();
    const items = seriesId
        ? data.amiibos.filter(a => a.series === seriesId)
        : data.amiibos;

    const unboxed = items.filter(a => data.states[a.id] === 1).length;
    const sealed = items.filter(a => data.states[a.id] === 2).length;

    return { unboxed, sealed, total: items.length };
}

function updateCounters() {
    const data = getCurrentData();

    data.series.forEach(seriesData => {
        const counterEl = document.getElementById(`counter-${seriesData.id}`);
        if (counterEl) {
            const { unboxed, sealed, total } = getCounts(seriesData.id);
            counterEl.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${unboxed + sealed}</span> / <strong>${total}</strong>`;
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
    if (card) {
        card.className = `amiibo-card state-${data.states[amiiboId]}`;
    }

    updateCounters();

    localStorage.setItem('amiiboStatesFigures', JSON.stringify(amiiboStatesFigures));
    localStorage.setItem('amiiboStatesCards', JSON.stringify(amiiboStatesCards));
}

function markAllInSeries(seriesId, state) {
    const data = getCurrentData();
    const seriesAmiibos = data.amiibos.filter(a => a.series === seriesId);

    seriesAmiibos.forEach(amiibo => {
        data.states[amiibo.id] = state;
        const card = document.querySelector(`[data-amiibo-id="${amiibo.id}"]`);
        if (card) {
            card.className = `amiibo-card state-${state}`;
        }
    });

    updateCounters();

    localStorage.setItem('amiiboStatesFigures', JSON.stringify(amiiboStatesFigures));
    localStorage.setItem('amiiboStatesCards', JSON.stringify(amiiboStatesCards));
}

function createAmiiboCard(amiibo) {
    const state = getCurrentData().states[amiibo.id];
    const imagePath = currentView === 'figures' ? 'figures' : 'cards';

    const card = document.createElement('div');
    card.className = `amiibo-card state-${state}`;
    card.setAttribute('data-amiibo-id', amiibo.id);

    card.innerHTML = `
        <div class="image-container">
            <img src="images/${imagePath}/${amiibo.series}/${amiibo.id}.png" 
                 alt="${amiibo.name}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="placeholder-image" style="display: none;">
                ${amiibo.name}
            </div>
        </div>
        <div class="amiibo-name">${amiibo.name}</div>
    `;

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

    const title = document.createElement('h2');
    title.style.borderLeftColor = seriesData.color;

    const headerContent = document.createElement('div');
    headerContent.className = 'series-header-content';

    const titleText = document.createElement('span');
    titleText.className = 'series-title';
    titleText.textContent = seriesData.name;

    const counter = document.createElement('span');
    counter.className = 'series-counter';
    counter.id = `counter-${seriesData.id}`;
    counter.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${unboxed + sealed}</span> / <strong>${total}</strong>`;

    headerContent.appendChild(titleText);
    headerContent.appendChild(counter);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'series-buttons';

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
    header.appendChild(title);

    return header;
}

function renderAmiibos() {
    const data = getCurrentData();
    const grid = document.getElementById('amiiboGrid');
    grid.innerHTML = '';

    data.series.forEach((seriesData, index) => {
        const seriesAmiibos = data.amiibos.filter(a => a.series === seriesData.id);
        if (seriesAmiibos.length > 0) {
            grid.appendChild(createSeriesHeader(seriesData));

            seriesAmiibos.forEach(amiibo => {
                grid.appendChild(createAmiiboCard(amiibo));
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

    renderAmiibos();

    setTimeout(() => {
        window.scrollTo(0, scrollPositions[view]);
    }, 0);
}

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        switchView(this.dataset.view);
    });
});

renderAmiibos();

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