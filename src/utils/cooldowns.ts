import { PrismaClient } from '.prisma/client';
import dayjs from 'dayjs';
import { CommandContext } from '../types';

export const cooldowns: {
    [command: string]: {
        [user: string]: dayjs.Dayjs;
    };
} = {};

export async function runCooldown(
    ctx: CommandContext | { db: PrismaClient },
    command: string,
    user: string,
    length: number,
    units: dayjs.OpUnitType,
    modify: boolean = true
): Promise<string | null> {
    if (!cooldowns[command]) {
        cooldowns[command] = {};
    }

    const now = dayjs();
    const lastUsed = cooldowns[command][user];

    if (lastUsed && lastUsed.isAfter(dayjs())) {
        return lastUsed.fromNow(true);
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: user } });
    if (wallet?.items.includes('cooldownium')) {
        length /= 2 ** Math.min(3, wallet?.items.filter(i => i === 'cooldownium').length);
    }

    if (modify) cooldowns[command][user] = now.add(length, units);
    return null;
}

export function runCooldownNoCooldownium(
    command: string,
    user: string,
    length: number,
    units: dayjs.OpUnitType,
    modify: boolean = true
) {
    if (!cooldowns[command]) {
        cooldowns[command] = {};
    }

    const now = dayjs();
    const lastUsed = cooldowns[command][user];

    if (lastUsed && lastUsed.isAfter(dayjs())) {
        return lastUsed.fromNow(true);
    }

    if (modify) cooldowns[command][user] = now.add(length, units);
    return null;
}
