import { describe, expect, it } from 'vitest';

import { isReservedEmailDomain, resolveDelivery } from './email-address';

describe('isReservedEmailDomain', () => {
  it.each([
    ['customer@crystalskirental.test', true],
    ['jan.novak@example.test', true],
    ['someone@example.com', true],
    ['someone@example.sk', false],
    ['someone@invalid', true],
    ['someone@localhost', true],
    ['SOMEONE@Example.Test', true],
    ['someone@testing.sk', false],
    ['someone@gmail.com', false],
  ])('%s', (email, reserved) => {
    expect(isReservedEmailDomain(email)).toBe(reserved);
  });
});

describe('resolveDelivery', () => {
  it('sends to a real address unchanged', () => {
    expect(resolveDelivery('jan@gmail.com', { captureAddress: 'delivered@resend.dev' })).toEqual({
      kind: 'send',
      to: 'jan@gmail.com',
    });
  });

  it('captures a reserved address under a label naming the original', () => {
    expect(resolveDelivery('customer@crystalskirental.test', { captureAddress: 'delivered@resend.dev' })).toEqual({
      kind: 'capture',
      to: 'delivered+customer-crystalskirental-test@resend.dev',
      subjectPrefix: '[to customer@crystalskirental.test] ',
    });
  });

  it('never captures a password reset for a seeded account', () => {
    const delivery = resolveDelivery('admin@crystalskirental.test', {
      captureAddress: 'delivered@resend.dev',
      neverCapture: true,
    });

    expect(delivery.kind).toBe('skip');
  });

  it('sends a password reset to a real address even with capture on', () => {
    expect(resolveDelivery('jan@gmail.com', { captureAddress: 'delivered@resend.dev', neverCapture: true })).toEqual({
      kind: 'send',
      to: 'jan@gmail.com',
    });
  });

  it('delivers reserved addresses to a local catch-all in development', () => {
    expect(resolveDelivery('customer@crystalskirental.test', { allowUndeliverable: true })).toEqual({
      kind: 'send',
      to: 'customer@crystalskirental.test',
    });
  });

  it('skips a reserved address when there is nowhere to put it', () => {
    expect(resolveDelivery('customer@crystalskirental.test')).toEqual({
      kind: 'skip',
      reason: 'reserved domain, nowhere to capture',
    });
  });
});
