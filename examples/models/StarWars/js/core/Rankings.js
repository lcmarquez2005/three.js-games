export class Rankings {
    constructor(storageKey = 'escapeRankings', maxEntries = 10) {
        this.storageKey = storageKey;
        this.maxEntries = maxEntries;
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    addEntry(name, score) {
        const entries = this.getAllEntries(); // Obtiene datos existentes
        const newEntry = {
            name,
            score,
            date: new Date().toLocaleDateString('es-ES'), // Fecha local
            timestamp: Date.now() // Para ordenar
        };
        
        entries.push(newEntry);
        entries.sort((a, b) => b.score - a.score); // Ordena de mayor a menor
        
        // 🔥 Guarda en localStorage (solo top 10):
        localStorage.setItem(this.storageKey, JSON.stringify(entries.slice(0, this.maxEntries)));
    }

    getAllEntries() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    getTopEntries(count = 5) {
        return this.getAllEntries().slice(0, count);
    }

    getPlayerBestScore(playerName) {
        const entries = this.getAllEntries();
        const playerEntries = entries.filter(entry => entry.name === playerName);
        return playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.score)) : 0;
    }

    clearRankings() {
        localStorage.removeItem(this.storageKey);
        this.initStorage();
        return [];
    }

    getRankingsHTML(count = 5) {
        const entries = this.getTopEntries(count);
        if (entries.length === 0) return '<p>No hay registros aún</p>';
        
        let html = '<ol style="text-align: left; margin: 0 auto; width: fit-content;">';
        entries.forEach((entry, index) => {
            const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '';
            html += `<li style="margin: 10px 0;">${medal} ${entry.name}: ${entry.score} puntos<br><small>${entry.date}</small></li>`;
        });
        html += '</ol>';
        
        return html;
    }
}