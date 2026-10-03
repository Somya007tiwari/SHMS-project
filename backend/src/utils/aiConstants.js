/**
 * Constants and mappings for AI Health Assistant.
 * Includes emergency red-flag keywords (English & Hinglish) and symptom-to-department mappings.
 */

const EMERGENCY_RED_FLAGS = [
  // Chest / Cardiac
  'chest pain', 'seene mein dard', 'dil mein dard', 'seena dard', 'crushing chest',
  'heart attack', 'cardiac arrest',
  
  // Breathing
  'cannot breathe', 'can\'t breathe', 'saans nahi', 'saans lene mein takleef',
  'shortness of breath', 'severe breathing difficulty', 'suffocating',

  // Bleeding / Trauma
  'severe bleeding', 'khun behna', 'uncontrolled bleeding', 'profuse bleeding',

  // Consciousness / Seizures
  'unconscious', 'behosh', 'behoshi', 'loss of consciousness', 'unresponsive',
  'seizure', 'seizures', 'daure', 'fit aana', 'convulsions',

  // Stroke
  'stroke', 'face drooping', 'slurred speech', 'arm weakness', 'numbness on one side',
  'chehre par lakwa',

  // Psychiatric Emergency
  'suicidal thoughts', 'suicidal', 'suicide', 'khudkushi', 'want to die',

  // Allergic & Poisoning
  'severe allergic reaction', 'anaphylaxis', 'airway swelling',
  'poisoning', 'poison', 'zeher', 'swallowed chemical'
];

const SYMPTOM_DEPARTMENT_MAP = [
  { keywords: ['chest', 'heart', 'cardio', 'dil', 'palpitations', 'blood pressure', 'bp'], department: 'Cardiology' },
  { keywords: ['skin', 'rash', 'itch', 'acne', 'tavcha', 'eczema', 'psoriasis', 'allergy'], department: 'Dermatology' },
  { keywords: ['child', 'baby', 'pediatric', 'bachha', 'infant', 'toddler'], department: 'Pediatrics' },
  { keywords: ['bone', 'joint', 'fracture', 'haddi', 'knee', 'back pain', 'spine'], department: 'Orthopedics' },
  { keywords: ['headache', 'seizure', 'brain', 'sar dard', 'numbness', 'migraine', 'dizziness'], department: 'Neurology' }
];

const DEFAULT_DEPARTMENT = 'General Medicine';

const DISCLAIMER_TEXT = 'This is general information, not a medical diagnosis or treatment advice. Please consult a qualified doctor.';

module.exports = {
  EMERGENCY_RED_FLAGS,
  SYMPTOM_DEPARTMENT_MAP,
  DEFAULT_DEPARTMENT,
  DISCLAIMER_TEXT
};
