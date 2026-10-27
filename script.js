/**
 * Raza Tech Institute - Official Client Application Script (script.js)
 * Pure Vanilla JavaScript (ES6+), Zero Frameworks, Production Quality
 */

import { initializeSupabaseEnrollment } from './src/supabase-enrollment.js';

'use strict';

/* ==========================================================================
   1. Institute Configuration (Easily Editable)
   ========================================================================== */
const INSTITUTE_CONFIG = {
  name: "Raza Tech Institute",
  // Configure the official WhatsApp number (with international code, without + or spaces)
  // Example for Pakistan: "923001234567"
  whatsappNumber: "YOUR_WHATSAPP_NUMBER",
  
  // Official admissions email
  email: "YOUR_EMAIL_ADDRESS", // e.g. info@razatechinstitute.com
  
  /**
   * Submission Method Options:
   * 'whatsapp'      : Prepares a formatted WhatsApp registration message and opens chat.
   * 'form_endpoint' : Posts data via fetch to an external form service (Formspree, Formkeep, etc.).
   * 'custom_api'    : Posts to an institute-controlled backend endpoint.
   */
  submissionMethod: "whatsapp",
  
  // Endpoint URL if using 'form_endpoint' or 'custom_api'
  formEndpointUrl: "YOUR_FORM_ENDPOINT_URL"
};

/* ==========================================================================
   2. DOM Ready Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileNav();
  initFaqAccordion();
  initEnrollmentModal();
  initializeSupabaseEnrollment();
  initBackToTop();
  initScrollAnimations();
  initActiveNavSpy();
  updateDynamicYear();
});

/* ==========================================================================
   3. Sticky Header
   ========================================================================== */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ==========================================================================
   4. Mobile Navigation Drawer
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('primaryNav');
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    toggleBtn.classList.toggle('active', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen);
  });

  // Close when clicking nav links
  navMenu.querySelectorAll('.nav-link, .btn').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!headerContains(e.target) && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  function headerContains(target) {
    const header = document.querySelector('.site-header');
    return header && header.contains(target);
  }
}

/* ==========================================================================
   5. Enrollment Modal & Course Auto-Selection
   ========================================================================== */
function initEnrollmentModal() {
  const modal = document.getElementById('enrollModal');
  const closeBtn = document.getElementById('closeModalBtn');
  if (!modal) return;

  // Open triggers
  document.querySelectorAll('[data-enroll-trigger]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const courseChoice = btn.getAttribute('data-course');
      openEnrollmentModal(courseChoice);
    });
  });

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeEnrollmentModal();
    });
  }

  // Backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeEnrollmentModal();
    }
  });

  // Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeEnrollmentModal();
    }
  });
}

function openEnrollmentModal(courseSlug) {
  const modal = document.getElementById('enrollModal');
  if (!modal) return;

  // Pre-select course in the modal form if specified
  if (courseSlug) {
    const courseSelect = modal.querySelector('#modalCourseSelect');
    if (courseSelect) {
      courseSelect.value = courseSlug;
    }
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus the first input for accessibility
  setTimeout(() => {
    const firstInput = modal.querySelector('input:not([type="hidden"]), select');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeEnrollmentModal() {
  const modal = document.getElementById('enrollModal');
  if (!modal) return;

  modal.classList.remove('active');
  document.body.style.overflow = '';
}

/* ==========================================================================
   6. Form Validation & Submission Integration
   ========================================================================== */
function initEnrollmentForm() {
  // We handle both in-page form and modal form
  const forms = [
    document.getElementById('pageEnrollmentForm'),
    document.getElementById('modalEnrollmentForm')
  ].filter(Boolean);

  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmission(form);
    });
  });
}

function handleFormSubmission(form) {
  const nameInput = form.querySelector('[name="fullName"]');
  const emailInput = form.querySelector('[name="email"]');
  const phoneInput = form.querySelector('[name="whatsappNumber"]');
  const ageSelect = form.querySelector('[name="ageGroup"]');
  const courseSelect = form.querySelector('[name="courseSelection"]');
  const levelSelect = form.querySelector('[name="languageLevel"]');
  const timeSelect = form.querySelector('[name="preferredTime"]');
  const msgInput = form.querySelector('[name="message"]');
  const consentCheckbox = form.querySelector('[name="consent"]');
  const statusBox = form.querySelector('.form-status-box');
  const submitBtn = form.querySelector('button[type="submit"]');

  let isValid = true;

  // 1. Full Name Validation
  if (!nameInput.value.trim() || nameInput.value.trim().length < 3) {
    markFieldError(nameInput, "Please enter your full name (at least 3 characters).");
    isValid = false;
  } else {
    clearFieldError(nameInput);
  }

  // 2. Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailInput.value.trim())) {
    markFieldError(emailInput, "Please enter a valid email address.");
    isValid = false;
  } else {
    clearFieldError(emailInput);
  }

  // 3. Phone / WhatsApp Validation (supports Pakistani formats like 03001234567, +923001234567, and international)
  const phoneVal = phoneInput.value.trim().replace(/[\s-]/g, '');
  const phoneRegex = /^(\+?[0-9]{10,15}|03[0-9]{9})$/;
  if (!phoneRegex.test(phoneVal)) {
    markFieldError(phoneInput, "Please enter a valid WhatsApp number (e.g. 03001234567 or +923001234567).");
    isValid = false;
  } else {
    clearFieldError(phoneInput);
  }

  // 4. Course Selection
  if (!courseSelect.value) {
    markFieldError(courseSelect, "Please choose a course.");
    isValid = false;
  } else {
    clearFieldError(courseSelect);
  }

  // 5. Consent Checkbox
  if (!consentCheckbox.checked) {
    markFieldError(consentCheckbox, "You must agree to be contacted regarding enrollment.");
    isValid = false;
  } else {
    clearFieldError(consentCheckbox);
  }

  if (!isValid) {
    if (statusBox) {
      statusBox.className = 'form-status-box error';
      statusBox.textContent = "Please correct the highlighted errors before submitting.";
      statusBox.style.display = 'block';
    }
    return;
  }

  // Collect sanitized form values
  const enrollmentData = {
    fullName: nameInput.value.trim(),
    email: emailInput.value.trim(),
    whatsapp: phoneVal,
    ageGroup: ageSelect ? ageSelect.value : "Not specified",
    course: courseSelect.options[courseSelect.selectedIndex].text,
    courseValue: courseSelect.value,
    level: levelSelect ? levelSelect.options[levelSelect.selectedIndex].text : "Not specified",
    preferredTime: timeSelect ? timeSelect.options[timeSelect.selectedIndex].text : "Flexible",
    message: msgInput && msgInput.value.trim() ? msgInput.value.trim() : "None provided",
    timestamp: new Date().toISOString()
  };

  // UI Processing State
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Preparing Enrollment...</span>`;

  // Route to the selected submission integration method
  if (INSTITUTE_CONFIG.submissionMethod === "whatsapp") {
    executeWhatsAppSubmission(enrollmentData, form, statusBox, submitBtn, originalBtnHtml);
  } else if (INSTITUTE_CONFIG.submissionMethod === "form_endpoint" || INSTITUTE_CONFIG.submissionMethod === "custom_api") {
    executeApiSubmission(enrollmentData, form, statusBox, submitBtn, originalBtnHtml);
  } else {
    // Default fallback
    executeWhatsAppSubmission(enrollmentData, form, statusBox, submitBtn, originalBtnHtml);
  }
}

/**
 * Option 1: WhatsApp Submission Workflow
 * Prepares an organized, readable WhatsApp message and opens chat with the institute.
 */
function executeWhatsAppSubmission(data, form, statusBox, submitBtn, originalBtnHtml) {
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;

    // Build human-readable WhatsApp message
    const rawMessage = 
      `*RAZA TECH INSTITUTE - COURSE ENROLLMENT REQUEST*\n` +
      `------------------------------------------------\n` +
      `*Student Name:* ${data.fullName}\n` +
      `*Selected Course:* ${data.course}\n` +
      `*Current Level:* ${data.level}\n` +
      `*Preferred Schedule:* ${data.preferredTime}\n` +
      `*Age Group:* ${data.ageGroup}\n` +
      `*Email Address:* ${data.email}\n` +
      `*WhatsApp:* ${data.whatsapp}\n` +
      `*Additional Notes:* ${data.message}\n` +
      `------------------------------------------------\n` +
      `_Submitted via Raza Tech Institute Official Website_`;

    const encodedMessage = encodeURIComponent(rawMessage);
    const targetNumber = INSTITUTE_CONFIG.whatsappNumber;
    
    const isPlaceholderNumber = targetNumber === "YOUR_WHATSAPP_NUMBER" || !targetNumber;
    const whatsappUrl = isPlaceholderNumber 
      ? `https://api.whatsapp.com/send?text=${encodedMessage}` 
      : `https://wa.me/${targetNumber}?text=${encodedMessage}`;

    if (statusBox) {
      statusBox.className = 'form-status-box success';
      statusBox.innerHTML = `
        <strong>✓ Enrollment Application Prepared Successfully!</strong>
        <p style="margin-top: 0.5rem; font-size: 0.9rem;">
          Thank you for choosing Raza Tech Institute, <strong>${escapeHtml(data.fullName)}</strong>. 
          To complete your registration, please send your pre-filled inquiry directly to our admissions desk via WhatsApp.
        </p>
        <div class="whatsapp-action-card">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            Click below to open WhatsApp with your application details ready to send:
          </p>
          <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background-color: #25D366; align-self: flex-start; text-decoration: none;">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"/></svg>
            <span>Send Details via WhatsApp</span>
          </a>
        </div>
      `;
      statusBox.style.display = 'block';
      statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 400);
}

/**
 * Option 2: Endpoint API Submission
 */
function executeApiSubmission(data, form, statusBox, submitBtn, originalBtnHtml) {
  fetch(INSTITUTE_CONFIG.formEndpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(data)
  })
  .then(res => {
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json().catch(() => ({}));
  })
  .then(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;

    if (statusBox) {
      statusBox.className = 'form-status-box success';
      statusBox.innerHTML = `
        <strong>✓ Application Successfully Submitted!</strong><br>
        Thank you, <strong>${escapeHtml(data.fullName)}</strong>. Our admissions team has received your registration for <strong>${escapeHtml(data.course)}</strong> and will contact you via WhatsApp/Email within 24 hours.
      `;
      statusBox.style.display = 'block';
      form.reset();
      statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  })
  .catch(err => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;

    if (statusBox) {
      statusBox.className = 'form-status-box error';
      statusBox.innerHTML = `
        <strong>Submission Notice:</strong> An error occurred while communicating with the server. Please try reaching us directly on WhatsApp or email.
      `;
      statusBox.style.display = 'block';
    }
  });
}

function markFieldError(inputEl, message) {
  inputEl.classList.add('error');
  let errorEl = inputEl.parentElement.querySelector('.field-error-msg');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'field-error-msg';
    inputEl.parentElement.appendChild(errorEl);
  }
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function clearFieldError(inputEl) {
  inputEl.classList.remove('error');
  const errorEl = inputEl.parentElement.querySelector('.field-error-msg');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

/* ==========================================================================
   7. FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const questionBtn = item.querySelector('.faq-question-btn');
    const collapse = item.querySelector('.faq-answer-collapse');
    if (!questionBtn || !collapse) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close sibling items
      items.forEach(other => {
        if (other !== item) {
          other.classList.remove('active');
          const otherBtn = other.querySelector('.faq-question-btn');
          const otherCollapse = other.querySelector('.faq-answer-collapse');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          if (otherCollapse) otherCollapse.style.maxHeight = null;
        }
      });

      if (isActive) {
        item.classList.remove('active');
        questionBtn.setAttribute('aria-expanded', 'false');
        collapse.style.maxHeight = null;
      } else {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
        collapse.style.maxHeight = collapse.scrollHeight + 'px';
      }
    });
  });
}

/* ==========================================================================
   8. Back to Top Button
   ========================================================================== */
function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* ==========================================================================
   9. Scroll Reveal Animations
   ========================================================================== */
function initScrollAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const elementsToReveal = document.querySelectorAll(
    '.about-card, .course-card, .why-card, .step-card, .contact-channel-item'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elementsToReveal.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(22px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

/* ==========================================================================
   10. Active Navigation Spy on Scroll
   ========================================================================== */
function initActiveNavSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-menu .nav-link');
  if (!sections.length || !navLinks.length) return;

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollPosition = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPosition >= top && scrollPosition < top + height) {
        currentId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (currentId && link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/* ==========================================================================
   11. Dynamic Copyright Year
   ========================================================================== */
function updateDynamicYear() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}
