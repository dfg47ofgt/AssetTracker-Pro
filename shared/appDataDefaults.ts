import { AppData, UserProfile } from '../types';
import { createDefaultBalances } from '../constants';

export const EMPTY_APP_DATA: AppData = {
  users: [],
  deposits: {},
  balances: {},
  history: {}
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const coerceUsers = (input: unknown): UserProfile[] => {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is UserProfile => {
    return Boolean(item && typeof item === 'object' && 'id' in item && 'name' in item);
  });
};

export const normalizeAppData = (input: unknown): AppData => {
  const base: AppData = {
    users: [],
    deposits: {},
    balances: {},
    history: {}
  };

  const data = isRecord(input) ? input : {};

  base.users = coerceUsers(data.users);

  if (isRecord(data.deposits)) {
    Object.entries(data.deposits).forEach(([userId, value]) => {
      base.deposits[userId] = Array.isArray(value) ? value : [];
    });
  }

  if (isRecord(data.balances)) {
    Object.entries(data.balances).forEach(([userId, value]) => {
      if (isRecord(value)) {
        const sanitized = value as Record<string, unknown>;
        base.balances[userId] = Object.keys(sanitized).reduce((acc, platform) => {
          const assets = sanitized[platform];
          acc[platform] = Array.isArray(assets) ? assets : [];
          return acc;
        }, {} as AppData['balances'][string]);
      }
    });
  }

  if (isRecord(data.history)) {
    Object.entries(data.history).forEach(([userId, value]) => {
      base.history[userId] = Array.isArray(value) ? value : [];
    });
  }

  // Ensure each user has corresponding containers
  base.users.forEach((user) => {
    const type = user.investmentType || 'CRYPTO';
    if (!base.deposits[user.id]) {
      base.deposits[user.id] = [];
    }
    if (!base.balances[user.id] || Object.keys(base.balances[user.id]).length === 0) {
      base.balances[user.id] = createDefaultBalances(type);
    }
    if (!base.history[user.id]) {
      base.history[user.id] = [];
    }
  });

  return base;
};
