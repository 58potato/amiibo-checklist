let amiiboStates = {};
try {
    const saved = localStorage.getItem('amiiboStates');
    amiiboStates = saved ? JSON.parse(saved) : {};
} catch (e) {
    amiiboStates = {};
}

amiibos.forEach(amiibo => {
    if (amiiboStates[amiibo.id] === undefined) {
        amiiboStates[amiibo.id] = 0;
    }
});

function saveStates() {
    try {
        localStorage.setItem('amiiboStates', JSON.stringify(amiiboStates));
    } catch (e) {
        console.error('Failed to save states');
    }
}

function getSeriesCounts(seriesId) {
    const seriesAmiibos = amiibos.filter(a => a.series === seriesId);
    const unboxed = seriesAmiibos.filter(a => amiiboStates[a.id] === 1).length;
    const sealed = seriesAmiibos.filter(a => amiiboStates[a.id] === 2).length;
    const total = seriesAmiibos.length;
    return { unboxed, sealed, total };
}

function getOverallCounts() {
    const unboxed = amiibos.filter(a => amiiboStates[a.id] === 1).length;
    const sealed = amiibos.filter(a => amiiboStates[a.id] === 2).length;
    const total = amiibos.length;
    return { unboxed, sealed, total };
}

function updateCounters() {
    series.forEach(seriesData => {
        const counterEl = document.getElementById(`counter-${seriesData.id}`);
        if (counterEl) {
            const { unboxed, sealed, total } = getSeriesCounts(seriesData.id);
            const owned = unboxed + sealed;
            counterEl.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${owned}</span> / <strong>${total}</strong>`;
        }
    });

    const overallCounter = document.getElementById('counter-overall');
    if (overallCounter) {
        const { unboxed, sealed, total } = getOverallCounts();
        const owned = unboxed + sealed;
        overallCounter.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${owned}</span> / <strong>${total}</strong>`;
    }
}

function cycleState(amiiboId) {
    amiiboStates[amiiboId] = (amiiboStates[amiiboId] + 1) % 3;
    saveStates();

    const card = document.querySelector(`[data-amiibo-id="${amiiboId}"]`);
    if (card) {
        card.className = `amiibo-card state-${amiiboStates[amiiboId]}`;
    }

    updateCounters();
}

function markAllInSeries(seriesId, state) {
    const seriesAmiibos = amiibos.filter(a => a.series === seriesId);

    seriesAmiibos.forEach(amiibo => {
        amiiboStates[amiibo.id] = state;
        const card = document.querySelector(`[data-amiibo-id="${amiibo.id}"]`);
        if (card) {
            card.className = `amiibo-card state-${state}`;
        }
    });

    saveStates();
    updateCounters();
}

function createAmiiboCard(amiibo) {
    const state = amiiboStates[amiibo.id];

    const card = document.createElement('div');
    card.className = `amiibo-card state-${state}`;
    card.setAttribute('data-amiibo-id', amiibo.id);

    card.innerHTML = `
        <div class="image-container">
            <img src="images/${amiibo.series}/${amiibo.id}.png" 
                 alt="${amiibo.name}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="placeholder-image" style="display: none;">
                ${amiibo.name}
            </div>
        </div>
        <div class="amiibo-name">${amiibo.name}</div>
    `;

    card.addEventListener('click', function(e) {
        e.preventDefault();
        cycleState(amiibo.id);
    });

    return card;
}

function createSeriesHeader(seriesData) {
    const header = document.createElement('div');
    header.className = 'series-header-full';

    const { unboxed, sealed, total } = getSeriesCounts(seriesData.id);
    const owned = unboxed + sealed;

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
    counter.innerHTML = `<span class="unboxed-count">${unboxed}</span> + <span class="sealed-count">${sealed}</span> = <span class="owned-count">${owned}</span> / <strong>${total}</strong>`;

    headerContent.appendChild(titleText);
    headerContent.appendChild(counter);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'series-buttons';

    const btnNotOwned = document.createElement('button');
    btnNotOwned.className = 'series-btn btn-not-owned';
    btnNotOwned.textContent = 'Mark all as Not Owned';
    btnNotOwned.onclick = (e) => {
        e.stopPropagation();
        markAllInSeries(seriesData.id, 0);
    };

    const btnUnboxed = document.createElement('button');
    btnUnboxed.className = 'series-btn btn-unboxed';
    btnUnboxed.textContent = 'Mark all as Unboxed';
    btnUnboxed.onclick = (e) => {
        e.stopPropagation();
        markAllInSeries(seriesData.id, 1);
    };

    const btnSealed = document.createElement('button');
    btnSealed.className = 'series-btn btn-sealed';
    btnSealed.textContent = 'Mark all as Sealed';
    btnSealed.onclick = (e) => {
        e.stopPropagation();
        markAllInSeries(seriesData.id, 2);
    };

    buttonsContainer.appendChild(btnNotOwned);
    buttonsContainer.appendChild(btnUnboxed);
    buttonsContainer.appendChild(btnSealed);

    title.appendChild(headerContent);
    title.appendChild(buttonsContainer);
    header.appendChild(title);

    return header;
}

function renderAmiibos() {
    const grid = document.getElementById('amiiboGrid');
    grid.innerHTML = '';

    series.forEach((seriesData, index) => {
        const seriesAmiibos = amiibos.filter(a => a.series === seriesData.id);
        if (seriesAmiibos.length > 0) {
            grid.appendChild(createSeriesHeader(seriesData));

            seriesAmiibos.forEach(amiibo => {
                grid.appendChild(createAmiiboCard(amiibo));
            });

            if (index < series.length - 1) {
                const spacer = document.createElement('div');
                spacer.className = 'series-spacer';
                grid.appendChild(spacer);
            }
        }
    });

    updateCounters();
}

renderAmiibos();