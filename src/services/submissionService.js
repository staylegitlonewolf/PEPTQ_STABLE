import { GOOGLE_SCRIPT_URL } from './api';

const requiredFields = ['name', 'institution', 'email', 'phone', 'intent'];
const GAS_SIMPLE_CONTENT_TYPE = 'text/plain;charset=utf-8';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const formatNumeric = (value, digits = 3) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return Number(numeric.toFixed(digits)).toString();
};

const formatCalculatorSummary = (calculator) => {
  if (!calculator || typeof calculator !== 'object') return '';

  const parts = [];

  const targetConcentration = formatNumeric(calculator.targetConcentrationMgPerMl, 3);
  if (targetConcentration) parts.push(`Target ${targetConcentration} mg/mL`);

  const plannedDose = formatNumeric(calculator.plannedDoseMg, 3);
  if (plannedDose) parts.push(`Dose ${plannedDose} mg`);

  const diluentVolume = formatNumeric(calculator.diluentVolumeMl, 3);
  if (diluentVolume) parts.push(`Diluent ${diluentVolume} mL`);

  const drawVolume = formatNumeric(calculator.drawVolumeMl, 3);
  if (drawVolume) parts.push(`Draw ${drawVolume} mL`);

  const millimolar = formatNumeric(calculator.approximateMillimolar, 3);
  if (millimolar) parts.push(`Approx ${millimolar} mM`);

  return parts.join('; ');
};

const formatManifestLine = (item) => {
  const name = normalizeText(item?.name);
  if (!name) return '';

  const strength = normalizeText(item?.strength);
  const calculatorSummary = formatCalculatorSummary(item?.calculator);
  const base = strength ? `${name} (${strength})` : name;

  return calculatorSummary ? `${base} [${calculatorSummary}]` : base;
};

export const buildSubmissionPayload = ({ formData, manifestItems = [], toAbsoluteImageUrl }) => {
  const productInterest = manifestItems
    .map((item) => formatManifestLine(item))
    .filter(Boolean)
    .join(' | ');

  const manifestCalculations = manifestItems
    .map((item) => {
      const name = normalizeText(item?.name);
      const calculatorSummary = formatCalculatorSummary(item?.calculator);
      if (!name || !calculatorSummary) return '';
      return `${name}: ${calculatorSummary}`;
    })
    .filter(Boolean)
    .join(' | ');

  const productImages = manifestItems
    .map((item) => toAbsoluteImageUrl?.(item?.image) ?? '')
    .map((url) => normalizeText(url))
    .filter(Boolean);

  return {
    name: normalizeText(formData?.contactName),
    institution: normalizeText(formData?.companyName),
    email: normalizeText(formData?.email),
    phone: normalizeText(formData?.phone),
    intent: normalizeText(formData?.researchArea),
    message: normalizeText(formData?.message),
    productInterest,
    manifestCalculations,
    productImages,
    preferredContact: normalizeText(formData?.preferredContact) || 'Email',
    agreed: Boolean(formData?.agreed),
  };
};

export const isPayloadSubmittable = (payload) => {
  if (!payload?.agreed) return false;
  return requiredFields.every((field) => normalizeText(payload?.[field]).length > 0);
};

const mapResearchInquiryToRequestCommand = (payload = {}) => ({
  command: 'SUBMIT_REQUEST',
  email: normalizeText(payload.email).toLowerCase(),
  full_name: normalizeText(payload.name),
  phone: normalizeText(payload.phone),
  auth_provider: 'Google',
  requested_role: 'MEMBER',
  institution: normalizeText(payload.institution),
  research_area: normalizeText(payload.intent),
  scope_description: normalizeText(payload.message),
  preferred_contact: normalizeText(payload.preferredContact) || 'Email',
  product_interest: normalizeText(payload.productInterest),
  manifest_calculations: normalizeText(payload.manifestCalculations),
  product_images: Array.isArray(payload.productImages) ? payload.productImages : [],
});

export const submitResearchInquiry = async (payload) => {
  if (!isPayloadSubmittable(payload)) {
    throw new Error('Submission blocked: required fields are missing.');
  }

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': GAS_SIMPLE_CONTENT_TYPE,
    },
    body: JSON.stringify(mapResearchInquiryToRequestCommand(payload)),
  });

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  const responseCode = String(parsed?.code || '').toUpperCase();
  const responseStatus = String(parsed?.status || '').toLowerCase();
  const isSuccessfulResponse =
    response.ok
    && parsed
    && (responseStatus === 'success' || responseCode.startsWith('SUCCESS_'));

  if (!isSuccessfulResponse) {
    const error = new Error(parsed?.message || 'Unable to submit research inquiry right now.');
    error.code = parsed?.code || 'ERR_RESEARCH_INQUIRY_FAILED';
    throw error;
  }

  return parsed;
};
