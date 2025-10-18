import {
  CancelAppointmentSchema,
  CreateAppointmentDto,
  CreateAppointmentSchema,
  GetAvailableSlotsSchema,
  UpdateAppointmentStatusSchema,
} from '@doctori/shared';
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createNestJSZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AppointmentService } from './appointment.service';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created successfully' })
  @ApiResponse({ status: 409, description: 'Doctor not available' })
  async create(
    @Body(createNestJSZodValidationPipe(CreateAppointmentSchema))
    createAppointmentDto: CreateAppointmentDto
  ) {
    return this.appointmentService.createAppointment(createAppointmentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiResponse({ status: 200, description: 'Appointment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async findOne(@Param('id') id: string) {
    return this.appointmentService.findAppointmentById(+id);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get appointments by patient' })
  @ApiResponse({ status: 200, description: 'Patient appointments retrieved' })
  async findByPatient(@Param('patientId') patientId: string) {
    return this.appointmentService.findAppointmentsByPatient(+patientId);
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get appointments by doctor' })
  @ApiResponse({ status: 200, description: 'Doctor appointments retrieved' })
  async findByDoctor(@Param('doctorId') doctorId: string) {
    return this.appointmentService.findAppointmentsByDoctor(+doctorId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update appointment status' })
  @ApiResponse({ status: 200, description: 'Appointment status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body(createNestJSZodValidationPipe(UpdateAppointmentStatusSchema)) body: { status: string }
  ) {
    return this.appointmentService.updateAppointmentStatus(+id, body.status);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiResponse({ status: 200, description: 'Appointment cancelled' })
  async cancel(
    @Param('id') id: string,
    @Body(createNestJSZodValidationPipe(CancelAppointmentSchema))
    body: { cancellationReason: string }
  ) {
    return this.appointmentService.cancelAppointment(+id, body.cancellationReason);
  }

  @Get('available-slots/:doctorId')
  @ApiOperation({ summary: 'Get available appointment slots' })
  @ApiResponse({ status: 200, description: 'Available slots retrieved' })
  async getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Body(createNestJSZodValidationPipe(GetAvailableSlotsSchema)) body: { date: Date }
  ) {
    return this.appointmentService.getAvailableSlots(+doctorId, body.date);
  }
}
