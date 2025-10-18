import { AppointmentStatus, CreateAppointmentDto, DoctoriLogger } from '@doctori/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { addMinutes } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentService {
  private readonly logger = new DoctoriLogger('AppointmentService');

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async createAppointment(createAppointmentDto: CreateAppointmentDto) {
    const { doctorId, appointmentDate, appointmentTime, duration } = createAppointmentDto;

    // Check if doctor is available
    const isAvailable = await this.checkDoctorAvailability(
      doctorId,
      appointmentDate,
      appointmentTime,
      duration
    );

    if (!isAvailable) {
      throw new ConflictException('Doctor is not available at this time');
    }

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        ...createAppointmentDto,
        appointmentDate: new Date(appointmentDate),
        appointmentTime: new Date(appointmentTime),
      },
    });

    // Emit appointment created event
    this.eventEmitter.emit('appointment.created', {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
    });

    this.logger.logBusinessEvent('Appointment created', {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
    });

    return appointment;
  }

  async findAppointmentById(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async findAppointmentsByPatient(patientId: number) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async findAppointmentsByDoctor(doctorId: number) {
    return this.prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async updateAppointmentStatus(id: number, status: string) {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: { status: status as AppointmentStatus },
    });

    // Emit appointment updated event
    this.eventEmitter.emit('appointment.updated', {
      appointmentId: appointment.id,
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
    });

    this.logger.logBusinessEvent('Appointment status updated', {
      appointmentId: appointment.id,
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
    });

    return appointment;
  }

  async cancelAppointment(id: number, cancellationReason: string) {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason,
      },
    });

    // Emit appointment cancelled event
    this.eventEmitter.emit('appointment.cancelled', {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      cancellationReason,
    });

    this.logger.logBusinessEvent('Appointment cancelled', {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      cancellationReason,
    });

    return appointment;
  }

  async getAvailableSlots(doctorId: number, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing appointments for the day
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
      },
      select: {
        appointmentTime: true,
        duration: true,
      },
    });

    // Get doctor's availability
    const availability = await this.prisma.availability.findMany({
      where: {
        doctorId,
        isActive: true,
      },
    });

    // Calculate available slots
    return this.calculateAvailableSlots(availability, existingAppointments, date);
  }

  private async checkDoctorAvailability(
    doctorId: number,
    appointmentDate: Date,
    appointmentTime: Date,
    duration: number
  ): Promise<boolean> {
    const endTime = addMinutes(appointmentTime, duration);

    // Check if there are conflicting appointments
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: new Date(appointmentDate),
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
        OR: [
          {
            appointmentTime: {
              lte: appointmentTime,
            },
            AND: {
              appointmentTime: {
                gte: endTime,
              },
            },
          },
          {
            appointmentTime: {
              gte: appointmentTime,
            },
            AND: {
              appointmentTime: {
                lte: endTime,
              },
            },
          },
        ],
      },
    });

    return !conflictingAppointment;
  }

  private calculateAvailableSlots(
    _availability: unknown[],
    _existingAppointments: unknown[],
    _date: Date
  ): unknown[] {
    // Implementation for calculating available slots
    // This would include logic to check doctor's working hours
    // and exclude already booked time slots
    return [];
  }
}
