import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function initializeSupabaseEnrollment() {
  const forms = [
    document.getElementById('pageEnrollmentForm'),
    document.getElementById('modalEnrollmentForm')
  ].filter(Boolean);

  forms.forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      void handleEnrollmentSubmission(form);
    });
  });

  if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
      const isVerificationRedirect = new URLSearchParams(window.location.search).get('enrollment') === 'verified';
      const hasPendingEnrollment = Boolean(session?.user.user_metadata?.pending_enrollment);

      if (event === 'SIGNED_IN' && isVerificationRedirect && hasPendingEnrollment) {
        showStatus(
          document.getElementById('pageFormStatus'),
          'Your email is verified and your enrollment request has been submitted. Our team will contact you about the next steps.',
          'success'
        );
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }
}

async function handleEnrollmentSubmission(form) {
  const getField = name => form.querySelector(`[name="${name}"]`);
  const nameInput = getField('fullName');
  const emailInput = getField('email');
  const passwordInput = getField('password');
  const phoneInput = getField('whatsappNumber');
  const ageSelect = getField('ageGroup');
  const courseSelect = getField('courseSelection');
  const levelSelect = getField('languageLevel');
  const timeSelect = getField('preferredTime');
  const messageInput = getField('message');
  const consentCheckbox = getField('consent');
  const statusBox = form.querySelector('.form-status-box');
  const submitButton = form.querySelector('button[type="submit"]');

  let valid = true;
  const email = emailInput.value.trim().toLowerCase();
  const whatsapp = phoneInput.value.trim().replace(/[\s-]/g, '');

  if (nameInput.value.trim().length < 3 || nameInput.value.trim().length > 120) {
    markFieldError(nameInput, 'Please enter your full name (3 to 120 characters).');
    valid = false;
  } else {
    clearFieldError(nameInput);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    markFieldError(emailInput, 'Please enter a valid email address.');
    valid = false;
  } else {
    clearFieldError(emailInput);
  }

  if (passwordInput.value.length < 8 || passwordInput.value.length > 72) {
    markFieldError(passwordInput, 'Use a password with 8 to 72 characters.');
    valid = false;
  } else {
    clearFieldError(passwordInput);
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

  if (!supabase) {
    showStatus(statusBox, 'Online enrollment is not configured yet. Please contact the institute directly.', 'error');
    return;
  }

  const enrollment = {
    submission_id: crypto.randomUUID(),
    full_name: nameInput.value.trim(),
    whatsapp_number: whatsapp,
    age_group: ageSelect.value,
    course: courseSelect.value,
    experience_level: levelSelect.value,
    preferred_time: timeSelect.value,
    message: messageInput.value.trim()
  };
  const password = passwordInput.value;
  const originalButtonContent = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  showStatus(statusBox, 'Submitting your enrollment request...', 'success');

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    let session = sessionData.session;
    if (session && session.user.email?.toLowerCase() !== email) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      session = null;
    }

    if (session) {
      await saveEnrollment(enrollment);
      showSubmittedStatus(statusBox);
      form.reset();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: enrollment.full_name,
          pending_enrollment: enrollment
        },
        emailRedirectTo: getVerificationRedirectUrl()
      }
    });

    const accountExists = error?.code === 'user_already_exists'
      || data?.user?.identities?.length === 0;

    if (accountExists) {
      await signInAndSubmit(email, password, enrollment, statusBox);
      form.reset();
      return;
    }

    if (error) throw error;

    if (data.session && data.user?.email_confirmed_at) {
      await saveEnrollment(enrollment);
      showSubmittedStatus(statusBox);
      form.reset();
      return;
    }

    if (data.session && !data.user?.email_confirmed_at) {
      throw new Error('Supabase email confirmation is required. Enable Confirm email in your Supabase Auth settings and try again.');
    }

    showStatus(
      statusBox,
      `Check ${email} for the verification link. Your enrollment will be submitted after you verify your email.`,
      'success'
    );
    form.reset();
  } catch (error) {
    console.error('Enrollment submission failed:', error);
    showStatus(statusBox, getPublicErrorMessage(error), 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonContent;
  }
}

async function signInAndSubmit(email, password, enrollment, statusBox) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error('An account already exists for this email. Enter its password to submit an enrollment.');
  }

  if (!data.user.email_confirmed_at) {
    throw new Error('Verify your email using the link in your inbox, then return and submit your enrollment again.');
  }

  await saveEnrollment(enrollment);
  showSubmittedStatus(statusBox);
}

async function saveEnrollment(enrollment) {
  const { error } = await supabase.rpc('submit_enrollment', {
    p_submission_id: enrollment.submission_id,
    p_full_name: enrollment.full_name,
    p_whatsapp_number: enrollment.whatsapp_number,
    p_age_group: enrollment.age_group,
    p_course: enrollment.course,
    p_experience_level: enrollment.experience_level,
    p_preferred_time: enrollment.preferred_time,
    p_message: enrollment.message
  });

  if (error) throw error;
}

function getVerificationRedirectUrl() {
  const redirectUrl = new URL(window.location.pathname, window.location.origin);
  redirectUrl.searchParams.set('enrollment', 'verified');
  return redirectUrl.toString();
}

function showSubmittedStatus(statusBox) {
  showStatus(
    statusBox,
    'Your email is verified and your enrollment request has been submitted. Our team will contact you about the next steps.',
    'success'
  );
}

function getPublicErrorMessage(error) {
  if (error.message?.includes('Email not confirmed')) {
    return 'Verify your email using the link in your inbox, then return and submit your enrollment again.';
  }
  if (error.message?.includes('Invalid login credentials')) {
    return 'An account already exists for this email. Enter its password to submit an enrollment.';
  }
  return error.message || 'We could not submit your enrollment. Please try again or contact the institute.';
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
