import {
  AppointmentLifecycleEvent,
  AppointmentStats,
  AppointmentStatus,
  Availability,
  CreateAppointmentDto,
  CreateAvailabilityDto,
  DoctoriLogger,
  TimeSlot,
  UpdateAvailabilityDto,
} from '@doctori/shared';
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
    const appointmentCreatedEvent: AppointmentLifecycleEvent = {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      appointmentType: appointment.appointmentType,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('appointment.created', appointmentCreatedEvent);

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
    availability: Availability[],
    existingAppointments: { appointmentTime: Date; duration: number }[],
    date: Date
  ): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    const dayOfWeek = this.getDayOfWeek(date);

    // Find availability for this day of week
    const dayAvailability = availability.find(av => av.dayOfWeek === dayOfWeek);

    if (!dayAvailability) {
      return availableSlots;
    }

    const startTime = new Date(date);
    startTime.setHours(
      dayAvailability.startTime.getHours(),
      dayAvailability.startTime.getMinutes(),
      0,
      0
    );

    const endTime = new Date(date);
    endTime.setHours(
      dayAvailability.endTime.getHours(),
      dayAvailability.endTime.getMinutes(),
      0,
      0
    );

    const slotDuration = dayAvailability.slotDuration;
    const currentTime = new Date();

    // Generate time slots
    let currentSlot = new Date(startTime);
    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, slotDuration);

      // Check if slot is in the future
      if (currentSlot > currentTime) {
        // Check if slot conflicts with existing appointments
        const hasConflict = existingAppointments.some(appointment => {
          const appointmentStart = new Date(appointment.appointmentTime);
          const appointmentEnd = addMinutes(appointmentStart, appointment.duration);

          return (
            (currentSlot >= appointmentStart && currentSlot < appointmentEnd) ||
            (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
            (currentSlot <= appointmentStart && slotEnd >= appointmentEnd)
          );
        });

        if (!hasConflict) {
          availableSlots.push({
            startTime: new Date(currentSlot),
            endTime: new Date(slotEnd),
            duration: slotDuration,
            isAvailable: true,
          });
        }
      }

      currentSlot = addMinutes(currentSlot, slotDuration);
    }

    return availableSlots;
  }

  private getDayOfWeek(date: Date): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  // Availability Management Methods
  async createAvailability(doctorId: number, availabilityData: CreateAvailabilityDto) {
    const availability = await this.prisma.availability.create({
      data: {
        ...availabilityData,
        doctorId,
      },
    });

    this.logger.logBusinessEvent('Doctor availability created', {
      availabilityId: availability.id,
      doctorId: availability.doctorId,
      dayOfWeek: availability.dayOfWeek,
    });

    return availability;
  }

  async getDoctorAvailability(doctorId: number) {
    return this.prisma.availability.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async updateAvailability(id: number, updateData: UpdateAvailabilityDto) {
    const availability = await this.prisma.availability.update({
      where: { id },
      data: updateData,
    });

    this.logger.logBusinessEvent('Doctor availability updated', {
      availabilityId: availability.id,
      doctorId: availability.doctorId,
      dayOfWeek: availability.dayOfWeek,
    });

    return availability;
  }

  async deleteAvailability(id: number) {
    const availability = await this.prisma.availability.delete({
      where: { id },
    });

    this.logger.logBusinessEvent('Doctor availability deleted', {
      availabilityId: availability.id,
      doctorId: availability.doctorId,
      dayOfWeek: availability.dayOfWeek,
    });

    return availability;
  }

  async getUpcomingAppointments(doctorId: number, limit: number = 10) {
    const now = new Date();

    return this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: now,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
      },
      orderBy: {
        appointmentDate: 'asc',
      },
      take: limit,
    });
  }

  async getAppointmentStats(doctorId: number): Promise<AppointmentStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [totalAppointments, completedAppointments, cancelledAppointments, thisMonthAppointments] =
      await Promise.all([
        this.prisma.appointment.count({
          where: { doctorId },
        }),
        this.prisma.appointment.count({
          where: { doctorId, status: 'COMPLETED' },
        }),
        this.prisma.appointment.count({
          where: { doctorId, status: 'CANCELLED' },
        }),
        this.prisma.appointment.count({
          where: {
            doctorId,
            appointmentDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
      ]);

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      thisMonthAppointments,
      completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
      cancellationRate:
        totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0,
    };
  }
}
