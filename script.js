document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initHeaderScroll();
    initServiceFilters();
    initFaqAccordion();
    initBackToTop();
    initDateRestrictions();
    initCookieBanner();
    initLanguageSwitcher();
    initAppointmentDoctors();
    initAppointmentSlotEvents();
});

const translations = {
    'Accueil': 'Home',
    'Urgences 24/7': 'Emergency 24/7',
    'Pôles & Soins': 'Departments & Care',
    'La Clinique': 'The Clinic',
    'Espace Patient': 'Patient Area',
    'Accès & Contact': 'Access & Contact',
    'Urgence Immédiate': 'Immediate Emergency',
    'Prendre rendez-vous': 'Book an appointment',
    'Prendre RDV': 'Book appointment',
    'Prendre rendez-vous en ligne': 'Book an appointment online',
    'Service des Urgences (24/7)': 'Emergency Department (24/7)',
    'Votre santé, notre engagement': 'Your health, our commitment',
    'humain et d\'excellence': 'with humanity and excellence',
    'Tous les services': 'All services',
    'Questions Fréquentes': 'Frequently Asked Questions',
    'Nous Rejoindre': 'Getting Here',
    'Prendre un rendez-vous médical': 'Book a medical appointment',
    'Découvrir nos accès': 'Discover how to get here',
    'Ouvert 24h/24 & 7j/7': 'Open 24/7',
    'Établissement conventionné & certifié HAS Qualité des Soins': 'Certified healthcare facility with a commitment to quality',
    'Pôles Médicaux & Soins Spécialisés': 'Medical Departments & Specialized Care',
    'Notre Établissement': 'Our Facility',
    'Guide Patient & Séjour Hospitalier': 'Patient Guide & Hospital Stay',
    'Localisation & Contact Pratique': 'Location & Practical Contact',
    'Préparer votre consultation': 'Prepare for your appointment',
    'Horaires des Visites': 'Visiting Hours',
    'Chambres & Confort du Séjour': 'Rooms & Stay Comfort',
    'Clinique Effort': 'Effort Clinic',
    'Urgences 24/7 :': 'Emergency 24/7:',
    'Prise en charge sans délai': 'Immediate care',
    'Accès facile': 'Easy access',
    'Parking & Transports': 'Parking & Transport',
    'Délai optimisé': 'Optimized waiting time',
    'Parcours patient fluide': 'Smooth patient journey',
    'Soins continus': 'Continuous care',
    'Équipe pluridisciplinaire': 'Multidisciplinary team',
    'Service des Urgences & Réanimation': 'Emergency & Intensive Care Department',
    'Chirurgie Générale & Ambulatoire': 'General & Ambulatory Surgery',
    'Maternité, Obstétrique & Pédiatrie': 'Maternity, Obstetrics & Pediatrics',
    'Imagerie Médicale (IRM & Scanner)': 'Medical Imaging (MRI & CT Scan)',
    'Laboratoire de Biologie Médicale': 'Medical Biology Laboratory',
    'Sans rendez-vous dès 07h00 du matin': 'Walk-ins available from 7:00 AM',
    'Résultats urgents disponibles en 1h': 'Urgent results available within 1 hour',
    'Merci': 'Thank you',
    'Lieu': 'Location',
    'Contact': 'Contact',
    'Patient': 'Patient',
    'Spécialité': 'Specialty',
    'Praticien': 'Practitioner',
    'Date & Heure': 'Date & Time',
    'Modalité': 'Appointment type'
};
const originalTextNodes = new WeakMap();

function initLanguageSwitcher() {
    const select = document.getElementById('languageSelect');
    if (!select) return;

    const savedLanguage = localStorage.getItem('cmef_language') || 'fr';
    select.value = savedLanguage;
    applyLanguage(savedLanguage);
    select.addEventListener('change', () => {
        localStorage.setItem('cmef_language', select.value);
        applyLanguage(select.value);
    });
}

function applyLanguage(language) {
    document.documentElement.lang = language;
    document.title = language === 'en'
        ? 'Effort Clinic | Emergency 24/7 - Kinshasa, DRC'
        : 'Clinique Effort | Urgences 24/7 - Kinshasa, RDC';

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        if (node.parentElement.closest('script, style')) continue;
        const original = originalTextNodes.get(node) || node.textContent;
        originalTextNodes.set(node, original);
        const trimmed = original.trim();
        if (!trimmed) continue;
        const translated = language === 'en' ? (translations[trimmed] || trimmed) : trimmed;
        node.textContent = original.replace(trimmed, translated);
    }

    document.querySelectorAll('[placeholder]').forEach(element => {
        if (!element.dataset.frPlaceholder) element.dataset.frPlaceholder = element.placeholder;
        if (language === 'en') {
            element.placeholder = translations[element.dataset.frPlaceholder] || element.dataset.frPlaceholder;
        } else {
            element.placeholder = element.dataset.frPlaceholder;
        }
    });
}

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
    loadAppointmentDoctors();
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

let appointmentDoctors = [];

function initAppointmentDoctors() {
    const docteurSelect = document.getElementById('rdvDocteur');
    if (!docteurSelect) return;

    docteurSelect.required = true;
    docteurSelect.innerHTML = '<option value="">Chargement des médecins...</option>';
}

async function loadAppointmentDoctors() {
    const docteurSelect = document.getElementById('rdvDocteur');
    if (!docteurSelect) return;

    docteurSelect.disabled = true;
    docteurSelect.innerHTML = '<option value="">Chargement des médecins...</option>';
    try {
        const response = await fetch('/api/medecins');
        if (!response.ok) throw new Error('Impossible de charger la liste des médecins.');
        appointmentDoctors = await response.json();
        updateDoctorsList();
    } catch (error) {
        docteurSelect.innerHTML = '<option value="">Liste des médecins indisponible</option>';
        showToast(error.message, 'error');
    } finally {
        docteurSelect.disabled = false;
    }
}

function updateDoctorsList() {
    const docteurSelect = document.getElementById('rdvDocteur');
    if (!docteurSelect) return;

    docteurSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = appointmentDoctors.length
        ? 'Choisissez un médecin...'
        : 'Aucun médecin disponible';
    placeholder.disabled = true;
    placeholder.selected = true;
    docteurSelect.appendChild(placeholder);

    appointmentDoctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = `Dr ${doctor.prenom} ${doctor.nom} — ${doctor.specialite}`;
        docteurSelect.appendChild(option);
    });
    docteurSelect.disabled = appointmentDoctors.length === 0;
    resetAppointmentSlots('Choisissez un médecin et une date pour afficher ses créneaux.');
}

function initAppointmentSlotEvents() {
    const doctorSelect = document.getElementById('rdvDocteur');
    const dateInput = document.getElementById('rdvDate');
    if (doctorSelect) {
        doctorSelect.addEventListener('change', loadAppointmentSlots);
    }
    if (dateInput) {
        dateInput.addEventListener('change', loadAppointmentSlots);
    }
}

function resetAppointmentSlots(message) {
    const slotsContainer = document.getElementById('slotsContainer');
    const selectedTimeSlot = document.getElementById('selectedTimeSlot');
    if (slotsContainer) {
        slotsContainer.innerHTML = `<p class="slots-message">${message}</p>`;
    }
    if (selectedTimeSlot) selectedTimeSlot.value = '';
}

async function loadAppointmentSlots() {
    const doctorId = document.getElementById('rdvDocteur')?.value;
    const date = document.getElementById('rdvDate')?.value;
    const slotsContainer = document.getElementById('slotsContainer');
    const selectedTimeSlot = document.getElementById('selectedTimeSlot');
    if (!doctorId || !date || !slotsContainer) {
        resetAppointmentSlots('Choisissez un médecin et une date pour afficher ses créneaux.');
        return;
    }

    if (selectedTimeSlot) selectedTimeSlot.value = '';
    slotsContainer.innerHTML = '<p class="slots-message">Chargement des disponibilités...</p>';
    try {
        const response = await fetch(`/api/medecins/${encodeURIComponent(doctorId)}/creneaux?date=${encodeURIComponent(date)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Impossible de charger les disponibilités.');
        if (!result.length) {
            resetAppointmentSlots('Aucun créneau disponible pour ce médecin à cette date.');
            return;
        }

        slotsContainer.replaceChildren(...result.map((slot) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'slot-btn';
            button.textContent = slot.slice(11, 16);
            button.dataset.slot = slot;
            button.addEventListener('click', () => selectSlot(button));
            return button;
        }));
    } catch (error) {
        resetAppointmentSlots(error.message);
        showToast(error.message, 'error');
    }
}

// Choix du créneau horaire
function selectSlot(button) {
    const slots = document.querySelectorAll('.slot-btn');
    slots.forEach(slot => slot.classList.remove('selected'));
    button.classList.add('selected');

    const input = document.getElementById('selectedTimeSlot');
    if (input) {
        input.value = button.dataset.slot || '';
    }
}

// Soumission du formulaire de rendez-vous
async function handleAppointmentSubmit(event) {
    event.preventDefault();

    const doctorSelect = document.getElementById('rdvDocteur');
    const doctorId = doctorSelect.value;
    const docteur = doctorSelect.options[doctorSelect.selectedIndex]?.textContent || '';
    const date = document.getElementById('rdvDate').value;
    const type = document.getElementById('rdvType').value === 'presentiel' ? 'Présentiel à l\'Hôpital' : 'Téléconsultation vidéo';
    const dateTime = document.getElementById('selectedTimeSlot').value;
    const nom = document.getElementById('rdvNom').value;
    const prenom = document.getElementById('rdvPrenom').value;
    const email = document.getElementById('rdvEmail').value;
    const tel = document.getElementById('rdvTel').value;
    const motif = document.getElementById('rdvMotif').value || 'Consultation standard';

    if (!doctorId || !dateTime) {
        showToast('Choisissez un médecin et un créneau disponible.', 'error');
        return;
    }

    const submitButton = document.querySelector('#rdvForm button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    let booking;
    try {
        const response = await fetch('/api/rendez-vous', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nom,
                prenom,
                telephone: tel,
                email,
                medecin_id: doctorId,
                date_heure: dateTime.replace('T', ' '),
                motif
            })
        });
        booking = await response.json();
        if (!response.ok) throw new Error(booking.error || 'Impossible d’enregistrer le rendez-vous.');
    } catch (error) {
        showToast(error.message, 'error');
        if (submitButton) submitButton.disabled = false;
        await loadAppointmentSlots();
        return;
    }

    const dateFormatee = new Date(dateTime).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const heure = dateTime.slice(11, 16);

    const recapCard = document.getElementById('recapCard');
    if (recapCard) {
        recapCard.innerHTML = `
            <div class="recap-item"><span>Code du rendez-vous :</span> <strong>${booking.code}</strong></div>
            <div class="recap-item"><span>Patient :</span> <strong>${prenom} ${nom}</strong></div>
            <div class="recap-item"><span>Praticien :</span> <strong>${docteur}</strong></div>
            <div class="recap-item"><span>Date & Heure :</span> <strong>${dateFormatee} à ${heure}</strong></div>
            <div class="recap-item"><span>Modalité :</span> <strong>${type}</strong></div>
            <div class="recap-item"><span>Contact :</span> <strong>${tel} • ${email}</strong></div>
            <div class="recap-item"><span>Lieu :</span> <strong>Clinique Effort - 012, Kinshasa, RDC</strong></div>
        `;
    }

    document.getElementById('rdvForm').style.display = 'none';
    document.getElementById('rdvSuccessScreen').style.display = 'block';

    showToast(booking.message || `Rendez-vous enregistré pour ${prenom} ${nom}.`);
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
