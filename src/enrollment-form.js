export function initializeEnrollmentForm() {
  const forms = [
    document.getElementById('pageEnrollmentForm'),
    document.getElementById('modalEnrollmentForm')
  ].filter(Boolean);

  forms.forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      void submitEnrollmentForm(form);
    });
  });
}

async function submitEnrollmentForm(form) {
  const field = name => form.querySelector(`[name="${name}"]`);
  const nameInput = field('fullName');
  const phoneInput = field('whatsappNumber');
  const courseSelect = field('courseSelection');
  const consentCheckbox = field('consent');
  const statusBox = form.parentElement.querySelector('.form-status-box');
  const submitButton = form.querySelector('button[type="submit"]');
  const whatsapp = phoneInput.value.trim().replace(/[\s-]/g, '');
  let valid = true;

  if (nameInput.value.trim().length < 3 || nameInput.value.trim().length > 120) {
    markFieldError(nameInput, 'Please enter your full name (3 to 120 characters).');
    valid = false;
  } else {
    clearFieldError(nameInput);
  }

  if (!/^(\+?[0-9]{10,15}|03[0-9]{9})$/.test(whatsapp)) {
    markFieldError(phoneInput, 'Please enter a valid WhatsApp number (e.g. 03001234567 or +923001234567).');
    valid = false;
  } else {
    clearFieldError(phoneInput);
  }

  if (!courseSelect.value) {
    markFieldError(courseSelect, 'Please choose a course.');
    valid = false;
  } else {
    clearFieldError(courseSelect);
  }

  if (!consentCheckbox.checked) {
    markFieldError(consentCheckbox, 'You must agree to be contacted regarding enrollment.');
    valid = false;
  } else {
    clearFieldError(consentCheckbox);
  }

  if (!valid) {
    showStatus(statusBox, 'Please correct the highlighted errors before submitting.', 'error');
    return;
  }

  if (field('website').value) {
    showStatus(statusBox, 'We could not submit your request. Please try again.', 'error');
    return;
  }

  const enrollment = {
    fullName: nameInput.value.trim(),
    whatsappNumber: whatsapp,
    ageGroup: field('ageGroup').value,
    course: courseSelect.value,
    experienceLevel: field('languageLevel').value,
    preferredTime: field('preferredTime').value,
    message: field('message').value.trim(),
    website: field('website').value.trim()
  };
  const originalButtonContent = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  showStatus(statusBox, 'Submitting your enrollment request...', 'success');

  try {
    const response = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrollment)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || 'We could not submit your request. Please try again.');
    }

    form.reset();
    showStatus(
      statusBox,
      'Thank you for registering! Your details have been received. Our team will contact you shortly on WhatsApp.',
      'success'
    );
  } catch (error) {
    console.error('Enrollment submission failed:', error);
    showStatus(
      statusBox,
      error.message || 'We could not submit your request. Please check your connection and try again.',
      'error'
    );
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonContent;
  }
}

function showStatus(statusBox, message, type) {
  if (!statusBox) return;
  statusBox.className = `form-status-box ${type}`;
  statusBox.textContent = message;
  statusBox.style.display = 'block';
  statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function markFieldError(input, message) {
  input.classList.add('error');
  const error = input.parentElement.querySelector('.field-error-msg');
  if (error) {
    error.textContent = message;
    error.style.display = 'block';
  }
}

function clearFieldError(input) {
  input.classList.remove('error');
  const error = input.parentElement.querySelector('.field-error-msg');
  if (error) error.style.display = 'none';
}
