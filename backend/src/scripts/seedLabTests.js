const { pool } = require('../config/database');

/**
 * Seed script for Phase 7 Lab Tests Catalog
 * NOTE: Normal ranges and prices are sample reference data for demonstration purposes only.
 */
const SAMPLE_LAB_TESTS = [
  {
    name: 'Complete Blood Count (CBC)',
    code: 'LAB-CBC',
    category: 'Hematology',
    description: 'Evaluates overall health and detects a wide range of disorders including anemia and infection.',
    price: 350.00,
    sampleType: 'Blood',
    preparationInstructions: 'No special preparation required. Fasting not mandatory.',
    turnaroundHours: 12,
    unit: '10^3/µL',
    normalMin: 4.5,
    normalMax: 11.0,
    normalText: 'WBC Count: 4.5 - 11.0 10^3/µL, Hemoglobin: 13.5 - 17.5 g/dL',
  },
  {
    name: 'Fasting Blood Sugar (FBS)',
    code: 'LAB-FBS',
    category: 'Biochemistry',
    description: 'Measures blood glucose levels after an overnight fast to screen for Diabetes.',
    price: 150.00,
    sampleType: 'Blood',
    preparationInstructions: 'Minimum 8 to 12 hours overnight fasting required. Water is allowed.',
    turnaroundHours: 6,
    unit: 'mg/dL',
    normalMin: 70.0,
    normalMax: 99.0,
    normalText: 'Normal: 70-99 mg/dL, Prediabetes: 100-125 mg/dL, Diabetes: >= 126 mg/dL',
  },
  {
    name: 'Postprandial Blood Sugar (PPBS)',
    code: 'LAB-PPBS',
    category: 'Biochemistry',
    description: 'Measures blood glucose levels 2 hours after a meal.',
    price: 150.00,
    sampleType: 'Blood',
    preparationInstructions: 'Give sample exactly 2 hours after starting breakfast or meal.',
    turnaroundHours: 6,
    unit: 'mg/dL',
    normalMin: 70.0,
    normalMax: 140.0,
    normalText: 'Normal: < 140 mg/dL',
  },
  {
    name: 'HbA1c (Glycated Hemoglobin)',
    code: 'LAB-HBA1C',
    category: 'Biochemistry',
    description: 'Reflects average blood sugar levels over the past 2-3 months.',
    price: 600.00,
    sampleType: 'Blood',
    preparationInstructions: 'Fasting not required.',
    turnaroundHours: 12,
    unit: '%',
    normalMin: 4.0,
    normalMax: 5.6,
    normalText: 'Normal: < 5.7%, Prediabetes: 5.7-6.4%, Diabetes: >= 6.5%',
  },
  {
    name: 'Lipid Profile',
    code: 'LAB-LIPID',
    category: 'Biochemistry',
    description: 'Measures Total Cholesterol, Triglycerides, HDL, and LDL levels.',
    price: 550.00,
    sampleType: 'Blood',
    preparationInstructions: 'Fasting for 10-12 hours required before sample collection.',
    turnaroundHours: 12,
    unit: 'mg/dL',
    normalMin: 125.0,
    normalMax: 200.0,
    normalText: 'Total Cholesterol < 200 mg/dL, Triglycerides < 150 mg/dL',
  },
  {
    name: 'Thyroid Stimulating Hormone (TSH)',
    code: 'LAB-TSH',
    category: 'Endocrinology',
    description: 'Assesses thyroid gland function and screens for hypothyroidism or hyperthyroidism.',
    price: 300.00,
    sampleType: 'Blood',
    preparationInstructions: 'Morning sample preferred. Inform doctor if taking thyroid medications.',
    turnaroundHours: 24,
    unit: 'mIU/L',
    normalMin: 0.5,
    normalMax: 4.5,
    normalText: 'Normal range: 0.5 - 4.5 mIU/L',
  },
  {
    name: 'Liver Function Test (LFT)',
    code: 'LAB-LFT',
    category: 'Biochemistry',
    description: 'Evaluates liver enzymes (SGOT, SGPT, Bilirubin, Alkaline Phosphatase).',
    price: 700.00,
    sampleType: 'Blood',
    preparationInstructions: 'Fasting for 8 hours recommended. Avoid alcohol for 24 hours prior.',
    turnaroundHours: 12,
    unit: 'U/L',
    normalMin: 7.0,
    normalMax: 56.0,
    normalText: 'SGPT/ALT: 7 - 56 U/L, Total Bilirubin: 0.2 - 1.2 mg/dL',
  },
  {
    name: 'Kidney Function Test (KFT / RFT)',
    code: 'LAB-KFT',
    category: 'Biochemistry',
    description: 'Measures Urea, Serum Creatinine, and Uric Acid levels.',
    price: 650.00,
    sampleType: 'Blood',
    preparationInstructions: 'Fasting not strictly required. Stay hydrated.',
    turnaroundHours: 12,
    unit: 'mg/dL',
    normalMin: 0.6,
    normalMax: 1.2,
    normalText: 'Serum Creatinine: 0.6 - 1.2 mg/dL, Blood Urea: 15 - 45 mg/dL',
  },
  {
    name: 'Urine Routine & Microscopy',
    code: 'LAB-URINE',
    category: 'Pathology',
    description: 'Physical, chemical, and microscopic examination of urine for UTI and kidney check.',
    price: 200.00,
    sampleType: 'Urine',
    preparationInstructions: 'First morning mid-stream urine sample in a sterile container.',
    turnaroundHours: 6,
    unit: null,
    normalMin: null,
    normalMax: null,
    normalText: 'Color: Pale Yellow, Clear. Pus cells: 0-5 /hpf. Protein & Glucose: Negative.',
  },
  {
    name: 'Chest X-Ray (PA View)',
    code: 'RAD-CXR',
    category: 'Radiology',
    description: 'Radiographic image of lungs, heart, and chest wall.',
    price: 450.00,
    sampleType: null,
    preparationInstructions: 'Remove neck jewelry and metal objects. Wear provided gown.',
    turnaroundHours: 2,
    unit: null,
    normalMin: null,
    normalMax: null,
    normalText: 'Lungs clear, cardiac silhouette within normal limits, no active lesion.',
  },
  {
    name: 'Vitamin D (25-Hydroxy)',
    code: 'LAB-VITD',
    category: 'Biochemistry',
    description: 'Measures Vitamin D levels for bone health and immune support.',
    price: 1200.00,
    sampleType: 'Blood',
    preparationInstructions: 'No special preparation needed.',
    turnaroundHours: 24,
    unit: 'ng/mL',
    normalMin: 30.0,
    normalMax: 100.0,
    normalText: 'Deficient: < 20 ng/mL, Insufficient: 20-29 ng/mL, Sufficient: 30-100 ng/mL',
  },
  {
    name: 'Vitamin B12 (Cyanocobalamin)',
    code: 'LAB-VITB12',
    category: 'Biochemistry',
    description: 'Evaluates Vitamin B12 deficiency affecting red blood cells and nerve function.',
    price: 950.00,
    sampleType: 'Blood',
    preparationInstructions: 'Fasting for 8 hours preferred.',
    turnaroundHours: 24,
    unit: 'pg/mL',
    normalMin: 200.0,
    normalMax: 900.0,
    normalText: 'Normal: 200 - 900 pg/mL',
  }
];

async function seedLabTests() {
  console.log('Seeding Lab Tests Catalog...');
  try {
    for (const test of SAMPLE_LAB_TESTS) {
      await pool.query(
        `INSERT INTO lab_tests (
          name, code, category, description, price, sample_type, preparation_instructions,
          turnaround_hours, unit, normal_min, normal_max, normal_text, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          sample_type = EXCLUDED.sample_type,
          preparation_instructions = EXCLUDED.preparation_instructions,
          turnaround_hours = EXCLUDED.turnaround_hours,
          unit = EXCLUDED.unit,
          normal_min = EXCLUDED.normal_min,
          normal_max = EXCLUDED.normal_max,
          normal_text = EXCLUDED.normal_text,
          updated_at = NOW()`,
        [
          test.name,
          test.code,
          test.category,
          test.description,
          test.price,
          test.sampleType,
          test.preparationInstructions,
          test.turnaroundHours,
          test.unit,
          test.normalMin,
          test.normalMax,
          test.normalText
        ]
      );
    }
    console.log(`✅ Successfully seeded ${SAMPLE_LAB_TESTS.length} lab tests!`);
  } catch (err) {
    console.error('❌ Seeding lab tests failed:', err.message);
  } finally {
    process.exit(0);
  }
}

seedLabTests();
