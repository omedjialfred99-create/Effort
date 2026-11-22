/* ============================================================
   Clinique Effort : assistant de rendez-vous en 3 étapes
   1. Choisir la date  →  2. Choisir l'horaire  →  3. Prendre rendez-vous
   À charger APRÈS script.js
   ============================================================ */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const modal = $('appointmentModal');
    const form = $('rdvForm');
    if (!modal || !form) return;

    const panels = [...form.querySelectorAll('.rdv-panel')];
    const items = [...form.querySelectorAll('.rdv-step-item')];
    const btnPrev = $('rdvBtnPrev');
    const btnNext = $('rdvBtnNext');
    const btnSubmit = $('btnSubmitAppointment');
    const body = form.querySelector('.rdv-body');
    const NEXT_LABELS = { 1: "Choisir l'horaire", 2: 'Prendre rendez-vous' };
    let current = 1;

    /* ---------- Helpers ---------- */
    const val = (name) => (form.querySelector('input[name="' + name + '"]:checked') || {}).value;
    const optText = (id) => {
        const s = $(id);
        return s && s.selectedIndex >= 0 && s.value ? s.options[s.selectedIndex].text : '';
    };
    const setRadio = (name, value) => {
        const r = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
        if (r) r.checked = true;
    };
    const fmtDate = (v) => v
        ? new Date(v + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '—';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- Dates cohérentes ---------- */
    // Pas de rendez-vous dans le passé, pas de naissance dans le futur
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    $('rdvDate').min = today;
    $('rdvDateNaissance').max = today;

    /* ---------- Cohérence du formulaire ---------- */
    // Civilité <-> Genre
    form.querySelectorAll('input[name="rdvCivilite"]').forEach((r) => r.addEventListener('change', () => {
        if (r.value === 'M.') setRadio('rdvGenre', 'Homme');
        else if (r.value === 'Mme' || r.value === 'Mlle') setRadio('rdvGenre', 'Femme');
        syncGuardian();
    }));
    form.querySelectorAll('input[name="rdvGenre"]').forEach((r) => r.addEventListener('change', () => {
        const civ = val('rdvCivilite');
        if (r.value === 'Femme' && civ === 'M.') setRadio('rdvCivilite', 'Mme');
        if (r.value === 'Homme' && (civ === 'Mme' || civ === 'Mlle')) setRadio('rdvCivilite', 'M.');
    }));

    // Parent / tuteur si « Enfant »
    function syncGuardian() {
        const isChild = val('rdvCivilite') === 'Enfant';
        $('rdvGuardianWrap').hidden = !isChild;
        $('rdvTuteurNom').required = isChild;
        $('rdvTuteurTel').required = isChild;
    }

    // N° de dossier si « Déjà patient »
    form.querySelectorAll('input[name="rdvStatut"]').forEach((r) => r.addEventListener('change', () => {
        $('rdvDossierWrap').hidden = val('rdvStatut') !== 'ancien';
    }));

    // N° de carte si une prise en charge est choisie
    $('rdvAssurance').addEventListener('change', () => {
        $('rdvAssuranceNumWrap').hidden = $('rdvAssurance').value === 'aucune';
    });

    // Email obligatoire en téléconsultation
    function syncEmail() {
        const tele = $('rdvType').value === 'teleconsultation';
        $('rdvEmail').required = tele;
        $('rdvEmailLabel').textContent = tele ? 'Adresse email * (lien de téléconsultation)' : 'Adresse email (optionnel)';
    }
    $('rdvType').addEventListener('change', syncEmail);

    // Lien « Demande d'informations » (voie hors ligne = rappel par le secrétariat)
    window.rdvAskInfo = function () {
        setRadio('rdvMode', 'rappel');
        if (typeof window.toggleBookingMode === 'function') window.toggleBookingMode('rappel');
        $('modeCardRappel').classList.add('active');
        $('modeCardSlot').classList.remove('active');
        go(1);
        $('rdvSpecialite').focus();
    };

    /* ---------- Contexte (étape 2) et récapitulatif (étape 3) ---------- */
    function renderContext() {
        const chips = [
            ['🩺', optText('rdvSpecialite')],
            ['👨‍⚕️', optText('rdvDocteur')],
            ['📅', fmtDate($('rdvDate').value)]
        ].filter((c) => c[1]);
        $('rdvContext').innerHTML = chips.map((c) => '<span class="rdv-chip">' + c[0] + ' ' + esc(c[1]) + '</span>').join('');
    }

    function renderRecap() {
        const rappel = val('rdvMode') === 'rappel';
        const rows = [
            ['Prestation', optText('rdvCategorie')],
            ['Spécialité', optText('rdvSpecialite')],
            ['Praticien', optText('rdvDocteur')],
            ['Modalité', optText('rdvType')],
            ['Date', fmtDate($('rdvDate').value)],
            [rappel ? 'Rappel souhaité' : 'Horaire', rappel ? $('rdvHeurePref').value : ($('selectedTimeSlot').value || '—')]
        ];
        $('rdvRecapRows').innerHTML = rows
            .map((r) => '<div class="rdv-recap-row"><span>' + r[0] + '</span><strong>' + esc(r[1]) + '</strong></div>')
            .join('');
    }

    /* ---------- Navigation ---------- */
    function go(n) {
        current = n;
        panels.forEach((p, i) => p.classList.toggle('active', i === n - 1));
        items.forEach((it, i) => {
            it.classList.toggle('active', i === n - 1);
            it.classList.toggle('done', i < n - 1);
            it.querySelector('.rdv-step-dot').textContent = i < n - 1 ? '✓' : i + 1;
        });
        btnPrev.textContent = n === 1 ? 'Annuler' : 'Retour';
        btnNext.style.display = n === panels.length ? 'none' : '';
        btnSubmit.style.display = n === panels.length ? '' : 'none';
        const t = $('rdvBtnNextText');
        if (t && NEXT_LABELS[n]) t.textContent = NEXT_LABELS[n];
        if (n === 2) renderContext();
        if (n === 3) renderRecap();
        body.scrollTop = 0;
    }
    window.rdvGoTo = go;

    function validate(n) {
        const fields = panels[n - 1].querySelectorAll('input, select, textarea');
        for (const f of fields) {
            if (f.type === 'hidden' || f.offsetParent === null) continue;
            if (!f.checkValidity()) { f.reportValidity(); return false; }
        }
        if (n === 2) {
            const needSlot = val('rdvMode') === 'creneau' && !$('selectedTimeSlot').value;
            $('rdvSlotError').hidden = !needSlot;
            if (needSlot) return false;
        }
        return true;
    }

    btnNext.addEventListener('click', () => { if (validate(current)) go(current + 1); });
    btnPrev.addEventListener('click', () => {
        if (current === 1) {
            if (typeof window.closeAppointmentModal === 'function') window.closeAppointmentModal();
        } else {
            go(current - 1);
        }
    });
    // Clic sur une étape déjà validée pour y revenir
    items.forEach((it, i) => it.addEventListener('click', () => {
        if (it.classList.contains('done')) go(i + 1);
    }));

    // La touche Entrée ne doit pas valider le formulaire avant l'étape 3
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && current < panels.length &&
            e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            btnNext.click();
        }
    });
    form.addEventListener('submit', (e) => {
        if (current < panels.length) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

    // Masque l'erreur de créneau dès qu'un créneau est choisi
    $('slotsContainer').addEventListener('click', () => {
        setTimeout(() => { $('rdvSlotError').hidden = true; }, 0);
    });

    // Retour à l'étape 1 à chaque ouverture du panneau
    new MutationObserver(() => {
        if (modal.classList.contains('active')) { go(1); syncGuardian(); syncEmail(); }
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });

    go(1);
    syncGuardian();
    syncEmail();
})();