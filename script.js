document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initHeaderScroll();
    initServiceFilters();
    initFaqAccordion();
    initBackToTop();
    initDateRestrictions();
    initCookieBanner();
});

function initNavigation() {
    const hamburger = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isOpen);
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !hamburger.contains(e.target) && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });

    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id], header[id]');
        const scrollPos = window.scrollY + 120;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
}

function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

function initServiceFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const serviceCards = document.querySelectorAll('.service-card');

    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            serviceCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                    card.style.opacity = '1';
                } else {
                    card.style.display = 'none';
                    card.style.opacity = '0';
                }
            });
        });
    });
}

function initFaqAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;
            const isExpanded = header.getAttribute('aria-expanded') === 'true';

            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherHeader = otherItem.querySelector('.accordion-header');
                    const otherContent = otherItem.querySelector('.accordion-content');
                    if (otherHeader) otherHeader.setAttribute('aria-expanded', 'false');
                    if (otherContent) otherContent.style.maxHeight = null;
                }
            });

            if (isExpanded) {
                item.classList.remove('active');
                header.setAttribute('aria-expanded', 'false');
                content.style.maxHeight = null;
            } else {
                item.classList.add('active');
                header.setAttribute('aria-expanded', 'true');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });
}

function initDateRestrictions() {
    const rdvDate = document.getElementById('rdvDate');
    if (rdvDate) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        rdvDate.min = `${yyyy}-${mm}-${dd}`;
        rdvDate.value = `${yyyy}-${mm}-${dd}`;
    }
}

function initBackToTop() {
    const backBtn = document.getElementById('backToTopBtn');
    if (!backBtn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backBtn.classList.add('visible');
        } else {
            backBtn.classList.remove('visible');
        }
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }
}

function openAppointmentModal(servicePreselect = '') {
    const modal = document.getElementById('appointmentModal');
    const select = document.getElementById('rdvSpecialite');
    const form = document.getElementById('rdvForm');
    const successScreen = document.getElementById('rdvSuccessScreen');

    if (!modal) return;

    if (form) form.style.display = 'block';
    if (successScreen) successScreen.style.display = 'none';

    if (servicePreselect && select) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value.toLowerCase().includes(servicePreselect.toLowerCase())) {
                select.selectedIndex = i;
                break;
            }
        }
        updateDoctorsList();
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Bloquer le défilement arrière
}

function closeAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('appointmentModal');
    if (e.target === modal) {
        closeAppointmentModal();
    }
});

// Échappe pour fermer
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAppointmentModal();
    }
});

// Mise à jour de la liste des praticiens selon la spécialité
function updateDoctorsList() {
    const specialite = document.getElementById('rdvSpecialite').value;
    const docteurSelect = document.getElementById('rdvDocteur');
    if (!docteurSelect) return;

    const doctorMap = {
        'Cardiologie': [
            'Premier praticien disponible',
            'Dr. M. Bernard (Cardiologue interventionnel)',
            'Dr. H. Vasseur (Rythmologie & Épreuves d\'effort)'
        ],
        'Chirurgie Ambulatoire': [
            'Premier praticien disponible',
            'Dr. S. Laroche (Chirurgie digestive & viscérale)',
            'Dr. L. Fabre (Chirurgie orthopédique)'
        ],
        'Maternité & Pédiatrie': [
            'Premier praticien disponible',
            'Dr. C. Dumont (Pédiatrie générale & néonatalogie)',
            'Mme E. Laurent (Sage-femme cadre - Consultations prénatales)'
        ],
        'Imagerie Médicale (IRM/Scanner)': [
            'Premier praticien disponible',
            'Pr. E. Garnier (Neuroradiologie & IRM 3T)',
            'Dr. B. Richard (Radiologie interventionnelle)'
        ],
        'Laboratoire de Biologie': [
            'Sans RDV ou biologiste disponible',
            'Dr. P. Morel (Biologiste médical)'
        ],
        'Urgences & Réanimation': [
            'Accueil sans RDV aux Urgences 24/7 (Présentez-vous directement)'
        ]
    };

    const doctors = doctorMap[specialite] || [
        'Premier praticien disponible',
        'Dr. M. Bernard (Cardiologue)',
        'Dr. S. Laroche (Chirurgien)',
        'Dr. C. Dumont (Pédiatre)',
        'Pr. E. Garnier (Radiologue)'
    ];

    docteurSelect.innerHTML = '';
    doctors.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc;
        option.textContent = doc;
        docteurSelect.appendChild(option);
    });
}

// Choix du créneau horaire
function selectSlot(button) {
    const slots = document.querySelectorAll('.slot-btn');
    slots.forEach(slot => slot.classList.remove('selected'));
    button.classList.add('selected');

    const input = document.getElementById('selectedTimeSlot');
    if (input) {
        input.value = button.textContent.trim();
    }
}

// Soumission du formulaire de rendez-vous
function handleAppointmentSubmit(event) {
    event.preventDefault();

    const specialite = document.getElementById('rdvSpecialite').value;
    const docteur = document.getElementById('rdvDocteur').value;
    const date = document.getElementById('rdvDate').value;
    const type = document.getElementById('rdvType').value === 'presentiel' ? 'Présentiel à l\'Hôpital' : 'Téléconsultation vidéo';
    const heure = document.getElementById('selectedTimeSlot').value || '09:15';
    const nom = document.getElementById('rdvNom').value;
    const prenom = document.getElementById('rdvPrenom').value;
    const email = document.getElementById('rdvEmail').value;
    const tel = document.getElementById('rdvTel').value;
    const motif = document.getElementById('rdvMotif').value || 'Consultation standard';

    // Génération d'un numéro de dossier fictif
    const codeDossier = 'EFF-' + Math.floor(100000 + Math.random() * 900000);

    // Formater la date en français
    let dateFormatee = date;
    try {
        const d = new Date(date);
        dateFormatee = d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {}

    // Remplissage du récapitulatif
    const recapCard = document.getElementById('recapCard');
    if (recapCard) {
        recapCard.innerHTML = `
            <div class="recap-item"><span>Numéro de dossier :</span> <strong>${codeDossier}</strong></div>
            <div class="recap-item"><span>Patient :</span> <strong>${prenom} ${nom}</strong></div>
            <div class="recap-item"><span>Spécialité :</span> <strong>${specialite}</strong></div>
            <div class="recap-item"><span>Praticien :</span> <strong>${docteur}</strong></div>
            <div class="recap-item"><span>Date & Heure :</span> <strong>${dateFormatee} à ${heure}</strong></div>
            <div class="recap-item"><span>Modalité :</span> <strong>${type}</strong></div>
            <div class="recap-item"><span>Contact :</span> <strong>${tel} • ${email}</strong></div>
            <div class="recap-item"><span>Lieu :</span> <strong>Clinique Effort - 012, Kinshasa, RDC</strong></div>
        `;
    }

    // Basculer l'affichage
    document.getElementById('rdvForm').style.display = 'none';
    document.getElementById('rdvSuccessScreen').style.display = 'block';

    showToast(`✅ Rendez-vous confirmé pour ${prenom} ${nom} !`);
}

function handleContactSubmit(event) {
    event.preventDefault();
    const nom = document.getElementById('contactNom').value;

    showToast(`Merci ${nom}, votre message a bien été transmis au secrétariat.`);
    document.getElementById('contactForm').reset();
}


function openEmergencyModal() {
    if (confirm("🚨 APPEL D'URGENCE MÉDICALE\n\nSouhaitez-vous composer directement le numéro des Urgences de la Clinique Effort (0819 456 654) ?\n\nEn cas d'urgence vitale immédiate, composez le 15 (SAMU).")) {
        window.location.href = "tel:0819456654";
    }
}

let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = 'toast-notification show toast-' + type;

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4500);
}


/* cookies */

function initCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;

    const consent = localStorage.getItem('cmef_cookie_consent');
    if (!consent) {
        setTimeout(() => {
            banner.classList.add('visible');
        }, 1200);
    }
}

function acceptCookies() {
    localStorage.setItem('cmef_cookie_consent', 'accepted');
    hideCookieBanner();
    showToast('Préférences enregistrées. Merci !', 'success');
}

function refuseCookies() {
    localStorage.setItem('cmef_cookie_consent', 'refused');
    hideCookieBanner();
    showToast('Cookies non essentiels refusés.', 'info');
}

function hideCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 600);
    }
}
