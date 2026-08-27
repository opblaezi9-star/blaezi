import { Router } from 'express';
import { db, Patient, Prescription } from '../db';
import { authenticateJWT, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/patients
router.get('/', authenticateJWT, (req, res) => {
  const { search } = req.query;

  let list = db.patients.map(p => {
    const dispensings = db.dispensings.filter(d => d.patientId === p.id);
    const prescriptions = db.prescriptions.filter(rx => rx.patientId === p.id);
    return {
      ...p,
      dispensingsCount: dispensings.length,
      prescriptionsCount: prescriptions.length,
    };
  });

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.medicalRecordNumber.toLowerCase().includes(q) ||
        p.contact.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: list.length,
    patients: list,
  });
});

// GET /api/patients/:id
router.get('/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const patient = db.patients.find(p => p.id === id || p.patientId === id);

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found.',
    });
  }

  const dispensings = db.dispensings
    .filter(d => d.patientId === patient.id)
    .map(d => ({
      ...d,
      details: db.dispensingDetails.filter(dd => dd.dispensingId === d.id),
    }));

  const prescriptions = db.prescriptions.filter(rx => rx.patientId === patient.id);

  res.json({
    success: true,
    patient,
    dispensings,
    prescriptions,
  });
});

// POST /api/patients
router.post('/', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { name, age, gender, contact, address, medicalRecordNumber, allergies, bloodGroup } = req.body;

  if (!name || age === undefined || !gender || !contact) {
    return res.status(400).json({
      success: false,
      message: 'Name, age, gender, and contact are required.',
    });
  }

  const count = db.patients.length + 1;
  const currentYear = new Date().getFullYear();
  const patientId = `PAT-${currentYear}-${String(count).padStart(3, '0')}`;
  const mrn = medicalRecordNumber || `MRN-${Math.floor(10000 + Math.random() * 90000)}`;

  const newPatient: Patient = {
    id: `pat-${Date.now()}`,
    patientId,
    name: name.trim(),
    age: parseInt(age, 10),
    gender: gender as any,
    contact: contact.trim(),
    address: address ? address.trim() : '',
    medicalRecordNumber: mrn,
    allergies: allergies ? allergies.trim() : 'None known',
    bloodGroup: bloodGroup || 'O+',
    createdAt: new Date().toISOString(),
  };

  db.patients.unshift(newPatient);
  db.save();

  logAudit(req, 'Create', 'patients', newPatient.id, `Registered patient ${newPatient.name} (${newPatient.patientId})`);

  res.status(201).json({
    success: true,
    message: 'Patient registered successfully.',
    patient: newPatient,
  });
});

// ==================== PRESCRIPTIONS ====================

// GET /api/patients/prescriptions/all
router.get('/prescriptions/all', authenticateJWT, (req, res) => {
  const { status, patientId, doctorId } = req.query;
  let list = [...db.prescriptions];

  if (status) {
    list = list.filter(rx => rx.status === status);
  }
  if (patientId) {
    list = list.filter(rx => rx.patientId === patientId);
  }
  if (doctorId) {
    list = list.filter(rx => rx.doctorId === doctorId);
  }

  res.json({
    success: true,
    count: list.length,
    prescriptions: list,
  });
});

// POST /api/patients/:id/prescriptions (Doctors & Admins can write prescriptions)
router.post('/:id/prescriptions', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { diagnosis, items } = req.body;

  const patient = db.patients.find(p => p.id === id || p.patientId === id);
  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found.',
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide at least one medicine in the prescription.',
    });
  }

  const user = req.user!;
  const count = db.prescriptions.length + 1;
  const prescriptionNumber = `RX-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

  const processedItems = items.map(item => {
    const med = db.medicines.find(m => m.id === item.medicineId);
    return {
      medicineId: item.medicineId,
      medicineName: med ? med.name : (item.medicineName || 'Medication'),
      dosage: item.dosage || '1 dose',
      frequency: item.frequency || 'Once daily',
      duration: item.duration || '5 days',
      quantity: parseInt(item.quantity, 10) || 1,
      instructions: item.instructions || 'Take as directed',
    };
  });

  const newPrescription: Prescription = {
    id: `prsc-${Date.now()}`,
    prescriptionNumber,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: user.id,
    doctorName: user.fullName,
    diagnosis: diagnosis || 'Clinical consultation',
    items: processedItems,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  db.prescriptions.unshift(newPrescription);
  db.save();

  logAudit(
    req,
    'Create',
    'prescriptions',
    newPrescription.id,
    `Prescription ${prescriptionNumber} created by ${user.fullName} for patient ${patient.name}`
  );

  res.status(201).json({
    success: true,
    message: 'Prescription created successfully.',
    prescription: newPrescription,
  });
});

// DELETE /api/patients/prescriptions/:rxId
router.delete('/prescriptions/:rxId', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { rxId } = req.params;
  const index = db.prescriptions.findIndex(p => p.id === rxId || p.prescriptionNumber === rxId);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found.',
    });
  }

  const rx = db.prescriptions[index];
  db.prescriptions.splice(index, 1);
  db.save();

  logAudit(
    req,
    'Delete',
    'prescriptions',
    rx.id,
    `Deleted prescription ${rx.prescriptionNumber} for patient ${rx.patientName}`
  );

  res.json({
    success: true,
    message: `Prescription "${rx.prescriptionNumber}" deleted successfully.`,
  });
});

// DELETE /api/patients/:id (Admin, Pharmacist, Doctor)
router.delete('/:id', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.patients.findIndex(p => p.id === id || p.patientId === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found.',
    });
  }

  const patient = db.patients[index];
  db.patients.splice(index, 1);
  // Also clean up any associated prescriptions for this patient
  db.prescriptions = db.prescriptions.filter(rx => rx.patientId !== patient.id && rx.patientId !== patient.patientId);
  db.save();

  logAudit(req, 'Delete', 'patients', patient.id, `Deleted patient record ${patient.name} (${patient.patientId})`);

  res.json({
    success: true,
    message: `Patient record for "${patient.name}" deleted successfully.`,
  });
});

export default router;
