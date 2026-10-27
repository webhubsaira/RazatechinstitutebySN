import { initializeEnrollmentForm } from './src/enrollment-form.js';

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileNav();
  initFaqAccordion();
  initEnrollmentModal();
  initializeEnrollmentForm();
  initBackToTop();
  initScrollAnimations();
  initActiveNavSpy();
  updateDynamicYear();
});

function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 30);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

function initMobileNav() {
  const toggleButton = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('primaryNav');
  if (!toggleButton || !navMenu) return;

  const closeMenu = () => {
    navMenu.classList.remove('open');
    toggleButton.classList.remove('active');
    toggleButton.setAttribute('aria-expanded', 'false');
  };

  toggleButton.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    toggleButton.classList.toggle('active', isOpen);
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  });

  navMenu.querySelectorAll('.nav-link, .btn').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', event => {
    if (!document.querySelector('.site-header')?.contains(event.target) && navMenu.classList.contains('open')) {
      closeMenu();
    }
  });
}

function initEnrollmentModal() {
  const modal = document.getElementById('enrollModal');
  const closeButton = document.getElementById('closeModalBtn');
  if (!modal) return;

  document.querySelectorAll('[data-enroll-trigger]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const course = button.getAttribute('data-course');
      const courseSelect = modal.querySelector('#modalCourseSelect');
      if (course && courseSelect) courseSelect.value = course;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => modal.querySelector('input:not([type="hidden"]):not(.form-trap), select')?.focus(), 100);
    });
  });

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
}

function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const button = item.querySelector('.faq-question-btn');
    const collapse = item.querySelector('.faq-answer-collapse');
    if (!button || !collapse) return;

    button.addEventListener('click', () => {
      const shouldOpen = !item.classList.contains('active');
      items.forEach(other => {
        other.classList.remove('active');
        other.querySelector('.faq-question-btn')?.setAttribute('aria-expanded', 'false');
        const otherCollapse = other.querySelector('.faq-answer-collapse');
        if (otherCollapse) otherCollapse.style.maxHeight = null;
      });

      if (shouldOpen) {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
        collapse.style.maxHeight = `${collapse.scrollHeight}px`;
      }
    });
  });
}

function initBackToTop() {
  const button = document.getElementById('backToTopBtn');
  if (!button) return;

  window.addEventListener('scroll', () => {
    button.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function initScrollAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  const elements = document.querySelectorAll(
    '.about-card, .course-card, .why-card, .step-card, .contact-channel-item'
  );
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(22px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
  });
}

function initActiveNavSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-menu .nav-link');
  if (!sections.length || !navLinks.length) return;

  window.addEventListener('scroll', () => {
    let activeId = '';
    const scrollPosition = window.scrollY + 120;
    sections.forEach(section => {
      if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
        activeId = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
    });
  }, { passive: true });
}

function updateDynamicYear() {
  const year = document.getElementById('currentYear');
  if (year) year.textContent = new Date().getFullYear();
}
