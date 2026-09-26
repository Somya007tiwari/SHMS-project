/**
 * AI Health Assistant - Rule-Based Symptom Checker
 * Provides basic symptom guidance and department recommendations.
 * DISCLAIMER: Not a substitute for professional medical advice.
 */

const SYMPTOM_DATABASE = [
  {
    keywords: ['chest pain', 'heart pain', 'palpitation', 'shortness of breath', 'breathing difficulty', 'irregular heartbeat'],
    department: 'Cardiology',
    severity: 'high',
    advice: 'These symptoms may indicate a cardiovascular condition. Please seek immediate medical attention if symptoms are severe.',
    urgency: '⚠️ Seek immediate care if severe'
  },
  {
    keywords: ['headache', 'migraine', 'dizziness', 'seizure', 'numbness', 'memory loss', 'confusion', 'stroke', 'vision blurry'],
    department: 'Neurology',
    severity: 'medium',
    advice: 'Neurological symptoms should be evaluated by a specialist. Seek emergency care if experiencing sudden severe headache or loss of consciousness.',
    urgency: '🔶 Consult within 24-48 hours'
  },
  {
    keywords: ['joint pain', 'knee pain', 'back pain', 'bone pain', 'fracture', 'muscle pain', 'sprain', 'arthritis'],
    department: 'Orthopedics',
    severity: 'low',
    advice: 'Musculoskeletal pain is common. Rest and avoid strenuous activities. Consult an orthopedic specialist for persistent pain.',
    urgency: '🟢 Schedule appointment soon'
  },
  {
    keywords: ['fever', 'cough', 'cold', 'flu', 'fatigue', 'weakness', 'nausea', 'vomiting', 'general', 'body ache'],
    department: 'General Medicine',
    severity: 'low',
    advice: 'Stay hydrated, rest, and monitor your temperature. Consult a general physician if symptoms persist beyond 3-5 days.',
    urgency: '🟢 Can wait 2-3 days'
  },
  {
    keywords: ['skin rash', 'itching', 'acne', 'eczema', 'psoriasis', 'hair loss', 'skin infection', 'allergy skin'],
    department: 'Dermatology',
    severity: 'low',
    advice: 'Avoid scratching affected areas. Keep skin clean and moisturized. A dermatologist can provide targeted treatment.',
    urgency: '🟢 Schedule appointment'
  },
  {
    keywords: ['eye pain', 'vision problem', 'blurry vision', 'red eye', 'eye infection', 'cataracts', 'glaucoma'],
    department: 'Ophthalmology',
    severity: 'medium',
    advice: 'Eye conditions can worsen quickly. Avoid rubbing your eyes and consult an ophthalmologist promptly.',
    urgency: '🔶 Consult within 24 hours'
  },
  {
    keywords: ['anxiety', 'depression', 'stress', 'mental health', 'panic attack', 'sleep disorder', 'insomnia', 'mood swings'],
    department: 'Psychiatry',
    severity: 'medium',
    advice: 'Mental health is as important as physical health. Speaking with a psychiatrist can help you manage these symptoms effectively.',
    urgency: '🔶 Consult within 1 week'
  },
  {
    keywords: ['child fever', 'child cough', 'infant', 'baby', 'vaccination', 'pediatric', 'child growth'],
    department: 'Pediatrics',
    severity: 'medium',
    advice: 'Children\'s symptoms can escalate quickly. A pediatrician specializes in child health and can provide appropriate care.',
    urgency: '🔶 Consult within 24 hours'
  },
  {
    keywords: ['cancer', 'tumor', 'lump', 'oncology', 'chemotherapy', 'biopsy'],
    department: 'Oncology',
    severity: 'high',
    advice: 'Early detection is key in cancer treatment. Please consult an oncologist as soon as possible for proper evaluation.',
    urgency: '⚠️ Urgent consultation needed'
  },
  {
    keywords: ['pregnancy', 'menstrual', 'period', 'gynecology', 'ovarian', 'uterus', 'pcos', 'fertility'],
    department: 'Gynecology',
    severity: 'medium',
    advice: 'Women\'s reproductive health requires specialized care. A gynecologist can provide comprehensive evaluation and treatment.',
    urgency: '🔶 Schedule appointment'
  }
];

const GENERAL_RESPONSES = {
  greeting: [
    "Hello! I'm your AI Health Assistant. I can help guide you toward the right medical department based on your symptoms. Please describe what you're experiencing.",
    "Hi there! I'm here to help you navigate your health concerns. What symptoms are you experiencing?",
    "Welcome! I can help match your symptoms to the appropriate medical department. What's troubling you today?"
  ],
  disclaimer: "⚠️ **Medical Disclaimer**: This AI assistant provides general guidance only and is NOT a substitute for professional medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.",
  emergency: "🚨 **EMERGENCY**: If you are experiencing a medical emergency (chest pain, difficulty breathing, loss of consciousness, severe bleeding), please call emergency services (112 in India) immediately or go to the nearest emergency room.",
  noMatch: "I couldn't identify a specific department for your symptoms. I recommend consulting our General Medicine department for an initial evaluation.",
  thankYou: "You're welcome! Remember to provide complete information to your doctor. Would you like to know anything else?"
};

const findDepartment = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Check for emergency keywords
  const emergencyKeywords = ['emergency', 'cant breathe', 'cannot breathe', 'heart attack', 'stroke', 'unconscious', 'severe bleeding', 'overdose'];
  if (emergencyKeywords.some(kw => lowerMessage.includes(kw))) {
    return {
      isEmergency: true,
      response: GENERAL_RESPONSES.emergency
    };
  }

  // Find matching symptoms
  let bestMatch = null;
  let maxMatches = 0;

  for (const entry of SYMPTOM_DATABASE) {
    const matches = entry.keywords.filter(kw => lowerMessage.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = entry;
    }
  }

  return { isEmergency: false, match: bestMatch, matchCount: maxMatches };
};

const aiAssistantService = {
  processMessage(message, conversationHistory = []) {
    const lowerMessage = message.toLowerCase().trim();

    // Greeting
    const greetingWords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'start', 'help'];
    if (greetingWords.some(g => lowerMessage.includes(g)) && message.length < 30) {
      return {
        type: 'greeting',
        message: GENERAL_RESPONSES.greeting[Math.floor(Math.random() * GENERAL_RESPONSES.greeting.length)],
        disclaimer: GENERAL_RESPONSES.disclaimer
      };
    }

    // Thank you
    if (['thank', 'thanks', 'ty', 'great', 'helpful'].some(t => lowerMessage.includes(t))) {
      return {
        type: 'thanks',
        message: GENERAL_RESPONSES.thankYou
      };
    }

    // Find department
    const { isEmergency, match, matchCount } = findDepartment(message);

    if (isEmergency) {
      return {
        type: 'emergency',
        message: GENERAL_RESPONSES.emergency
      };
    }

    if (!match || matchCount === 0) {
      return {
        type: 'no_match',
        message: GENERAL_RESPONSES.noMatch,
        suggestion: 'General Medicine',
        disclaimer: GENERAL_RESPONSES.disclaimer,
        followUp: 'Can you describe your symptoms in more detail?'
      };
    }

    return {
      type: 'recommendation',
      department: match.department,
      severity: match.severity,
      urgency: match.urgency,
      advice: match.advice,
      message: `Based on your symptoms, I recommend consulting our **${match.department}** department.\n\n**${match.urgency}**\n\n${match.advice}`,
      disclaimer: GENERAL_RESPONSES.disclaimer,
      actions: [
        { label: 'Book Appointment', link: `/patient/book-appointment?department=${encodeURIComponent(match.department)}` }
      ]
    };
  },

  getWelcomeMessage() {
    return {
      type: 'welcome',
      message: GENERAL_RESPONSES.greeting[0],
      disclaimer: GENERAL_RESPONSES.disclaimer,
      quickSuggestions: [
        'I have chest pain',
        'I have a severe headache',
        'My child has a high fever',
        'I have skin rash and itching',
        'I feel anxious and stressed',
        'I have joint and knee pain'
      ]
    };
  }
};

module.exports = aiAssistantService;
