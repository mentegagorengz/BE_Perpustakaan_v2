import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const buildInterceptor = (handlerMetadata: Record<string, unknown> = {}) => {
    const handler = () => undefined;
    Object.entries(handlerMetadata).forEach(([key, value]) =>
      Reflect.defineMetadata(key, value, handler),
    );
    const reflector = new Reflector();
    const interceptor = new ResponseInterceptor(reflector);
    const context = {
      getHandler: () => handler,
      getClass: () => ResponseInterceptor,
    } as unknown as ExecutionContext;
    return { interceptor, context };
  };

  const run = async (data: unknown, metadata: Record<string, unknown> = {}) => {
    const { interceptor, context } = buildInterceptor(metadata);
    return new Promise((resolve, reject) => {
      interceptor
        .intercept(context, { handle: () => of(data) } as any)
        .subscribe({ next: resolve, error: reject });
    });
  };

  it('membungkus object polos dengan success true dan message Success', async () => {
    const result = await run({ id: 1, title: 'Buku A' });

    expect(result).toEqual({
      success: true,
      message: 'Success',
      data: { id: 1, title: 'Buku A' },
    });
  });

  it('data array dibiarkan sebagai data (tanpa meta)', async () => {
    const result = await run([{ id: 1 }, { id: 2 }]);

    expect(result).toEqual({
      success: true,
      message: 'Success',
      data: [{ id: 1 }, { id: 2 }],
    });
  });

  it('handler mengembalikan undefined → data dinormalisasi jadi null', async () => {
    const result = await run(undefined);

    expect(result).toEqual({ success: true, message: 'Success', data: null });
  });

  it('payload paginasi { data, meta } di-untangle: data array + meta top-level', async () => {
    const meta = {
      page: 1,
      limit: 10,
      total_items: 1,
      total_pages: 1,
      has_next_page: false,
      has_prev_page: false,
    };
    const result = await run({ data: [{ id: 1 }], meta });

    expect(result).toEqual({
      success: true,
      message: 'Success',
      data: [{ id: 1 }],
      meta,
    });
  });

  it('paginasi kosong tetap menghasilkan data array + meta', async () => {
    const result = await run({
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total_items: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false,
      },
    });

    expect(result).toEqual({
      success: true,
      message: 'Success',
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total_items: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false,
      },
    });
  });

  it('payload yang sudah berbentuk envelope dilewatkan apa adanya', async () => {
    const envelope = {
      success: false,
      message: 'Ops',
      data: null,
      error: { code: 'BAD_REQUEST', details: null },
    };

    expect(await run(envelope)).toEqual(envelope);
  });

  it('@ResponseMessage memakai pesan kustom sebagai message envelope', async () => {
    const result = await run({ id: 1 }, { response_message: 'Buku dibuat' });

    expect(result).toEqual({
      success: true,
      message: 'Buku dibuat',
      data: { id: 1 },
    });
  });

  it('@BypassTransform melewati payload mentah tanpa envelope', async () => {
    const result = await run({ raw: true }, { bypass_transform: true });

    expect(result).toEqual({ raw: true });
  });

  it('Date dinormalisasi ke ISO 8601 UTC tanpa milidetik', async () => {
    const result = await run({
      created_at: new Date('2026-08-11T05:26:55.123Z'),
      items: [{ added_at: new Date('2026-08-11T05:26:55.000Z') }],
    });

    expect(result).toEqual({
      success: true,
      message: 'Success',
      data: {
        created_at: '2026-08-11T05:26:55Z',
        items: [{ added_at: '2026-08-11T05:26:55Z' }],
      },
    });
  });
});
