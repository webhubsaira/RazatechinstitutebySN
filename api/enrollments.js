import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const allowedCourses = new Set(['arabic', 'english', 'digital-marketing']);
const allowedAgeGroups = new Set(['Under 18', '18-25', '26-40', '40+']);
const allowedExperienceLevels = new Set(['beginner', 'elementary', 'intermediate']);
const allowedTimes = new Set(['Flexible', 'Morning', 'Afternoon', 'Evening']);

let supabase;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  if (!isSameOriginRequest(request)) {
    return sendJson(response, 403, { error: 'Request origin is not allowed.' });
  }

  if (!request.headers['content-type']?.toLowerCase().includes('application/json')) {
    return sendJson(response, 415, { error: 'Content-Type must be application/json.' });
  }

  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > 10_000) {
    return sendJson(response, 413, { error: 'Request is too large.' });
  }

  let enrollment;
  try {
    enrollment = await readJsonBody(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'Request is too large.';
    return sendJson(response, tooLarge ? 413 : 400, {
      error: tooLarge ? 'Request is too large.' : 'Invalid request body.'
    });
  }

  const validationError = validateEnrollment(enrollment);
  if (validationError) return sendJson(response, 400, { error: validationError });

  const ipAddress = getClientIp(request);
  if (!ipAddress) {
    return sendJson(response, 400, { error: 'Unable to verify request. Please try again.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Enrollment API is missing its Supabase server environment variables.');
    return sendJson(response, 503, { error: 'Enrollment is temporarily unavailable. Please try again later.' });
  }

  try {
    if (!supabase) {
      supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }

    const { error } = await supabase.rpc('submit_public_enrollment', {
      p_submission_id: randomUUID(),
      p_full_name: enrollment.fullName.trim(),
      p_whatsapp_number: enrollment.whatsappNumber.trim().replace(/[\s-]/g, ''),
      p_age_group: enrollment.ageGroup,
      p_course: enrollment.course,
      p_experience_level: enrollment.experienceLevel,
      p_preferred_time: enrollment.preferredTime,
      p_message: enrollment.message.trim(),
      p_ip_hash: createHmac('sha256', serviceRoleKey).update(ipAddress).digest('hex')
    });

    if (error) {
      if (error.message === 'rate_limited') {
        return sendJson(response, 429, { error: 'Too many requests. Please wait a little while and try again.' });
      }
      console.error('Supabase enrollment write failed:', error);
      return sendJson(response, 500, { error: 'We could not save your request. Please try again.' });
    }

    return sendJson(response, 201, { message: 'Enrollment request received.' });
  } catch (error) {
    console.error('Enrollment API failed:', error);
    return sendJson(response, 500, { error: 'We could not save your request. Please try again.' });
  }
}

function isSameOriginRequest(request) {
  const origin = request.headers.origin;
  if (!origin) return false;

  const forwardedHost = request.headers['x-forwarded-host'];
  const requestHost = (forwardedHost || request.headers.host || '').split(',')[0].trim();
  if (!requestHost) return false;

  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

async function readJsonBody(request) {
  if (Buffer.isBuffer(request.body)) {
    if (request.body.length > 10_000) throw new Error('Request is too large.');
    return JSON.parse(request.body.toString('utf8'));
  }
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body) > 10_000) throw new Error('Request is too large.');
    return JSON.parse(request.body);
  }
  if (request.body && typeof request.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(request.body)) > 10_000) throw new Error('Request is too large.');
    return request.body;
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 10_000) throw new Error('Request is too large.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validateEnrollment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid enrollment details.';
  if (typeof value.website === 'string' && value.website.trim()) return 'Invalid enrollment details.';
  if (typeof value.fullName !== 'string' || value.fullName.trim().length < 3 || value.fullName.trim().length > 120) {
    return 'Please enter your full name (3 to 120 characters).';
  }
  if (typeof value.whatsappNumber !== 'string' || !/^(\+?[0-9]{10,15}|03[0-9]{9})$/.test(value.whatsappNumber.trim().replace(/[\s-]/g, ''))) {
    return 'Please enter a valid WhatsApp number.';
  }
  if (!allowedCourses.has(value.course)) return 'Please choose a valid course.';
  if (!allowedAgeGroups.has(value.ageGroup)) return 'Please choose a valid age group.';
  if (!allowedExperienceLevels.has(value.experienceLevel)) return 'Please choose a valid experience level.';
  if (!allowedTimes.has(value.preferredTime)) return 'Please choose a valid learning time.';
  if (typeof value.message !== 'string' || value.message.length > 2000) return 'Your message must be 2000 characters or fewer.';
  return null;
}

function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor !== 'string') return null;
  const forwardedAddresses = forwardedFor.split(',');
  const ipAddress = forwardedAddresses[forwardedAddresses.length - 1].trim();
  return ipAddress.length <= 64 ? ipAddress : null;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}
