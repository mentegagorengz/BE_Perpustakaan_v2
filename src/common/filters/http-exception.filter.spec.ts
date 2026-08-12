import { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  const catchException = (exception: unknown) => {
    const json = jest.fn();
    const response = {
      status: jest.fn().mockReturnValue({ json }),
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    return { status: response.status, json };
  };

  it('error string biasa → envelope error { success, message, error } tanpa data', () => {
    const { status, json } = catchException(
      new BadRequestException('Data tidak valid'),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Data tidak valid',
      error: { code: 'BAD_REQUEST', details: null },
    });
  });

  it('validasi per-field ({ field, message }[]) → details array + message ringkas', () => {
    const { json } = catchException(
      new BadRequestException([
        { field: 'email', message: 'email harus valid' },
        { field: 'password', message: 'password minimal 8' },
      ]),
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Validasi gagal',
      error: {
        code: 'BAD_REQUEST',
        details: [
          { field: 'email', message: 'email harus valid' },
          { field: 'password', message: 'password minimal 8' },
        ],
      },
    });
  });

  it('array string biasa → message di-join, details null', () => {
    const { json } = catchException(
      new BadRequestException(['a rusak', 'b rusak']),
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'a rusak, b rusak',
      error: { code: 'BAD_REQUEST', details: null },
    });
  });

  it('UnauthorizedException → code UNAUTHORIZED', () => {
    const { json } = catchException(
      new UnauthorizedException('Invalid email or password'),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'UNAUTHORIZED', details: null },
      }),
    );
  });

  it('NotFoundException → code NOT_FOUND', () => {
    const { json } = catchException(
      new NotFoundException('Buku tidak ditemukan'),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'NOT_FOUND', details: null },
      }),
    );
  });

  it('ConflictException → code CONFLICT', () => {
    const { json } = catchException(
      new ConflictException('Data registrasi sudah terdaftar'),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'CONFLICT', details: null },
      }),
    );
  });

  it('ThrottlerException → 429 code TOO_MANY_REQUESTS', () => {
    const { status, json } = catchException(
      new ThrottlerException('Too many requests'),
    );

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', details: null },
      }),
    );
  });

  it('error non-HttpException → 500 code INTERNAL_SERVER_ERROR', () => {
    const { status, json } = catchException(new Error('boom'));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      error: { code: 'INTERNAL_SERVER_ERROR', details: null },
    });
  });
});
