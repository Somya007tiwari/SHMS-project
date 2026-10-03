import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assistantService } from '../../services/services';
import {
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Clock,
  User,
  Heart,
  Stethoscope,
  IndianRupee,
  Star,
  ChevronRight,
  Info,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const QUICK_SYMPTOMS = [
  'Fever & chills',
  'Dry cough',
  'Severe headache',
  'Stomach pain',
  'Skin rash & itching',
  'Joint & muscle pain',
  'Dizziness',
  'Lower back pain'
];

const PatientAIAssistant = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Form State
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [language, setLanguage] = useState('en');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleQuickAdd = (chipText) => {
    setSymptoms((prev) => (prev ? `${prev}, ${chipText}` : chipText));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!symptoms.trim() || symptoms.trim().length < 3) {
      setError('Please describe your symptoms in at least 3 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await assistantService.analyze({
        symptoms: symptoms.trim(),
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        durationDays: durationDays ? parseInt(durationDays, 10) : undefined,
        language
      });

      if (res.data?.success) {
        setResult(res.data.data);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response.data?.message || 'Daily limit reached. Please try again tomorrow.');
      } else {
        setError(err.response?.data?.message || 'Failed to analyze symptoms. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'mild':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300';
      case 'moderate':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300';
      case 'emergency':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header Title & Description */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <Sparkles size={24} />
          </span>
          AI Health Assistant
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Describe your symptoms to receive informational triage guidance and doctor recommendations.
        </p>
      </div>

      {/* Top Disclaimer Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start gap-3 text-blue-800 dark:text-blue-300 text-sm">
        <Info size={20} className="flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div>
          <strong className="font-semibold">Informational Triage Only:</strong> This tool provides preliminary health information and department suggestions. It is <em>not</em> a medical diagnosis or treatment plan. If you feel very unwell, consult a doctor promptly.
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <form onSubmit={handleAnalyze} className="space-y-5">
          {/* Language Toggle & Header */}
          <div className="flex items-center justify-between">
            <label htmlFor="symptoms-input" className="block text-sm font-semibold text-gray-900 dark:text-white">
              Describe Your Symptoms <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  language === 'en'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  language === 'hi'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          {/* Symptoms Input Textarea */}
          <div className="relative">
            <textarea
              id="symptoms-input"
              rows={4}
              maxLength={1000}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'अपने लक्षणों के बारे में विस्तार से लिखें (जैसे बुखार, सिरदर्द, पेट में दर्द)...'
                  : 'Describe how you feel in detail (e.g. fever for 2 days, dry cough, headache)...'
              }
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
              {symptoms.length} / 1000 characters
            </div>
          </div>

          {/* Quick Symptoms Chips */}
          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
              Quick Add Symptoms:
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_SYMPTOMS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickAdd(chip)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg transition"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Details (Age, Gender, Duration) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label htmlFor="age-input" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Age (Optional)
              </label>
              <input
                id="age-input"
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 32"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="gender-select" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gender (Optional)
              </label>
              <select
                id="gender-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="duration-input" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (Days)
              </label>
              <input
                id="duration-input"
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="e.g. 3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Privacy Disclaimer Note */}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            🔒 <strong>Privacy Note:</strong> Do not enter your name, phone number, address, or other sensitive personal identifiers in the text area.
          </p>

          {/* Error Message Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !symptoms.trim()}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing Symptoms...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Analyze Symptoms
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results View Container */}
      <div aria-live="polite">
        {result && result.emergency ? (
          /* Emergency Red Banner State */
          <div className="bg-red-600 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-full flex-shrink-0">
                <ShieldAlert size={36} />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-extrabold uppercase tracking-wider rounded-full">
                  Critical Alert
                </span>
                <h2 className="text-2xl font-bold">Medical Emergency Warning</h2>
                <p className="text-red-100 text-sm sm:text-base leading-relaxed">
                  {result.message}
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-700/60 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-red-200 uppercase font-semibold">Emergency Helpline (India)</p>
                <p className="text-2xl font-black">112</p>
              </div>
              <a
                href="tel:112"
                className="px-5 py-2.5 bg-white text-red-600 font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-red-50 transition shadow"
              >
                <PhoneCall size={18} />
                Call 112 Now
              </a>
            </div>

            <p className="text-xs text-red-200 italic">
              {result.disclaimer}
            </p>
          </div>
        ) : result ? (
          /* Normal Triage Result View */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6 animate-fade-in">
            {/* Triage Header & Severity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-gray-400">Analysis Mode:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {result.mode === 'ai' ? '🤖 AI Powered' : '⚡ Rule-Based'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  Health Triage Report
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Severity Level:</span>
                <span className={`px-3 py-1 text-xs font-extrabold uppercase rounded-full border ${getSeverityBadge(result.severity)}`}>
                  {result.severity}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-750/50 rounded-xl space-y-1">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {result.summary}
              </p>
            </div>

            {/* Possible Conditions */}
            {result.possibleConditions?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" />
                  Possible Associated Conditions (Informational Only)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.possibleConditions.map((cond, idx) => (
                    <div key={idx} className="p-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-xl space-y-1">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cond.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cond.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Self-Care & When to See Doctor Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Self-Care Tips */}
              {result.selfCare?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Self-Care Guidance
                  </h3>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                    {result.selfCare.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* When to See Doctor */}
              {result.seeDoctorWhen?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    When to Seek Medical Care
                  </h3>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                    {result.seeDoctorWhen.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Red Flags Warning List */}
            {result.redFlags?.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Red-Flag Symptoms to Watch For:
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-amber-900 dark:text-amber-200">
                  {result.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span>⚠️</span> {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Departments & Doctor Cards */}
            {result.recommendedDepartments?.length > 0 && (
              <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Stethoscope size={20} className="text-blue-600 dark:text-blue-400" />
                    Recommended Medical Departments & Specialists
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You can book an appointment directly with specialized doctors in the recommended departments below.
                  </p>
                </div>

                {result.recommendedDepartments.map((deptGroup) => (
                  <div key={deptGroup.departmentId} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-bold rounded-lg border border-blue-200 dark:border-blue-800">
                        🏥 {deptGroup.departmentName} Department
                      </span>
                      <button
                        onClick={() => navigate(`/patient/book-appointment?departmentId=${deptGroup.departmentId}`)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        View All Department Doctors <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Doctor Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {deptGroup.doctors?.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 bg-gray-50 dark:bg-gray-750/60 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3 hover:border-blue-400 transition"
                        >
                          <div className="flex items-center gap-3">
                            {doc.profileImage ? (
                              <img
                                src={doc.profileImage}
                                alt={doc.name}
                                className="w-11 h-11 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                                {doc.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('')}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.name}</h4>
                              <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{doc.specialization}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                              <IndianRupee size={12} /> {doc.consultationFee}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              {doc.rating > 0 ? (
                                <>
                                  <Star size={12} className="text-amber-400 fill-amber-400" />
                                  {doc.rating.toFixed(1)}
                                </>
                              ) : (
                                <span className="text-gray-400">New</span>
                              )}
                            </span>
                          </div>

                          <button
                            onClick={() => navigate(`/patient/book-appointment?doctorId=${doc.id}`)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                          >
                            Book Appointment <ChevronRight size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Disclaimer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-750/40 rounded-xl text-xs text-gray-500 dark:text-gray-400 text-center italic border border-gray-100 dark:border-gray-700">
              {result.disclaimer}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PatientAIAssistant;
