import { AppointmentStatus, AppointmentType, DayOfWeek, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding appointment service database...');

  // Check if data already exists
  const existingAvailability = await prisma.availability.count();
  const existingAppointments = await prisma.appointment.count();

  if (existingAvailability > 0 || existingAppointments > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `⚠️  Database already contains ${existingAvailability} availability records and ${existingAppointments} appointments. Skipping seeding to avoid duplicates.`
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.log('📝 No existing data found. Proceeding with seeding...');

  // Create sample availability for doctors
  const availabilityData = [
    // Doctor 1 - Monday to Friday, 9 AM to 5 PM
    {
      doctorId: 1,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      slotDuration: 30,
      isActive: true,
    },
    {
      doctorId: 1,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      slotDuration: 30,
      isActive: true,
    },
    {
      doctorId: 1,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      slotDuration: 30,
      isActive: true,
    },
    {
      doctorId: 1,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      slotDuration: 30,
      isActive: true,
    },
    {
      doctorId: 1,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      slotDuration: 30,
      isActive: true,
    },
    // Doctor 2 - Monday to Friday, 8 AM to 4 PM
    {
      doctorId: 2,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: new Date('2024-01-01T08:00:00Z'),
      endTime: new Date('2024-01-01T16:00:00Z'),
      slotDuration: 45,
      isActive: true,
    },
    {
      doctorId: 2,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: new Date('2024-01-01T08:00:00Z'),
      endTime: new Date('2024-01-01T16:00:00Z'),
      slotDuration: 45,
      isActive: true,
    },
    {
      doctorId: 2,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: new Date('2024-01-01T08:00:00Z'),
      endTime: new Date('2024-01-01T16:00:00Z'),
      slotDuration: 45,
      isActive: true,
    },
    {
      doctorId: 2,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: new Date('2024-01-01T08:00:00Z'),
      endTime: new Date('2024-01-01T16:00:00Z'),
      slotDuration: 45,
      isActive: true,
    },
    {
      doctorId: 2,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: new Date('2024-01-01T08:00:00Z'),
      endTime: new Date('2024-01-01T16:00:00Z'),
      slotDuration: 45,
      isActive: true,
    },
    // Doctor 3 - Tuesday to Saturday, 10 AM to 6 PM
    {
      doctorId: 3,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T18:00:00Z'),
      slotDuration: 60,
      isActive: true,
    },
    {
      doctorId: 3,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T18:00:00Z'),
      slotDuration: 60,
      isActive: true,
    },
    {
      doctorId: 3,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T18:00:00Z'),
      slotDuration: 60,
      isActive: true,
    },
    {
      doctorId: 3,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T18:00:00Z'),
      slotDuration: 60,
      isActive: true,
    },
    {
      doctorId: 3,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T18:00:00Z'),
      slotDuration: 60,
      isActive: true,
    },
  ];

  // Create availability records
  for (const availability of availabilityData) {
    await prisma.availability.upsert({
      where: {
        id:
          availability.doctorId * 100 +
          (availability.dayOfWeek === 'MONDAY'
            ? 1
            : availability.dayOfWeek === 'TUESDAY'
              ? 2
              : availability.dayOfWeek === 'WEDNESDAY'
                ? 3
                : availability.dayOfWeek === 'THURSDAY'
                  ? 4
                  : availability.dayOfWeek === 'FRIDAY'
                    ? 5
                    : availability.dayOfWeek === 'SATURDAY'
                      ? 6
                      : 7),
      },
      update: availability,
      create: availability,
    });
  }

  // Create sample appointments
  const appointmentData = [
    {
      patientId: 1,
      doctorId: 1,
      appointmentDate: new Date('2024-12-20'),
      appointmentTime: new Date('2024-12-20T10:00:00Z'),
      duration: 30,
      appointmentType: AppointmentType.IN_PERSON,
      status: AppointmentStatus.SCHEDULED,
      reasonForVisit: 'Regular checkup',
      symptoms: 'None',
      notes: 'Annual physical examination',
    },
    {
      patientId: 2,
      doctorId: 1,
      appointmentDate: new Date('2024-12-20'),
      appointmentTime: new Date('2024-12-20T11:00:00Z'),
      duration: 30,
      appointmentType: AppointmentType.ONLINE,
      status: AppointmentStatus.CONFIRMED,
      reasonForVisit: 'Follow-up consultation',
      symptoms: 'Mild headache',
      notes: 'Follow-up from previous visit',
      meetingLink: 'https://meet.example.com/room123',
      meetingPassword: 'pass123',
    },
    {
      patientId: 3,
      doctorId: 2,
      appointmentDate: new Date('2024-12-21'),
      appointmentTime: new Date('2024-12-21T09:00:00Z'),
      duration: 45,
      appointmentType: AppointmentType.IN_PERSON,
      status: AppointmentStatus.SCHEDULED,
      reasonForVisit: 'Specialist consultation',
      symptoms: 'Chest pain',
      notes: 'Cardiology consultation',
    },
    {
      patientId: 1,
      doctorId: 3,
      appointmentDate: new Date('2024-12-22'),
      appointmentTime: new Date('2024-12-22T14:00:00Z'),
      duration: 60,
      appointmentType: AppointmentType.ONLINE,
      status: AppointmentStatus.COMPLETED,
      reasonForVisit: 'Mental health consultation',
      symptoms: 'Anxiety',
      notes: 'Initial consultation completed',
      meetingLink: 'https://meet.example.com/room456',
    },
    {
      patientId: 2,
      doctorId: 2,
      appointmentDate: new Date('2024-12-19'),
      appointmentTime: new Date('2024-12-19T10:30:00Z'),
      duration: 45,
      appointmentType: AppointmentType.PHONE,
      status: AppointmentStatus.CANCELLED,
      reasonForVisit: 'Consultation',
      symptoms: 'Fever',
      notes: 'Patient cancelled due to emergency',
      cancelledAt: new Date('2024-12-19T09:00:00Z'),
      cancellationReason: 'Family emergency',
    },
  ];

  // Create appointment records
  for (const appointment of appointmentData) {
    await prisma.appointment.create({
      data: appointment,
    });
  }

  // eslint-disable-next-line no-console
  console.log('✅ Appointment service seeding completed!');
  // eslint-disable-next-line no-console
  console.log(`📅 Created ${availabilityData.length} availability records`);
  // eslint-disable-next-line no-console
  console.log(`📋 Created ${appointmentData.length} appointment records`);
}

main()
  .catch(e => {
    // eslint-disable-next-line no-console
    console.error('❌ Error seeding appointment service:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
