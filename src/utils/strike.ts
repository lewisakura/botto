import type { PrismaClient, Strike } from '@prisma/client';
import axios from 'axios';
import Eris from 'eris';

export const cutoff = 5;

export const strikeWeightMap: { [reason: string]: number } = {
    'minor spamming': 1,
    flooding: 1,
    'pinging staff': 1,
    'misuse of channels': 1,
    'minor toxicity': 1,
    'controversial topics': 1,
    'non-english': 1,
    toxicity: 2,
    'purposefully breaking rules': 2,
    'major flooding': 2,
    advertising: 2,
    'inappropriate media': 3,
    racism: 3,
    homophobia: 3,
    slurs: 3,
    nsfw: 3,
    'extreme toxicity': 3,
    trolling: 3,
    gore: 4,
    'extreme gore': 5,
    doxxing: 5,
    'ip grabbing': 5,
    scamming: 5,
    raiding: 5,
    underage: 5,
    pedophilia: 5,
    'ban evasion': 5
};

export const aliases: { [reason: string]: string } = {
    ads: 'advertising',
    'speak english': 'non-english',
    spamming: 'minor spamming',
    'light spamming': 'minor spamming',
    'light toxicity': 'minor toxicity',
    'major toxicity': 'extreme toxicity',
    'extreme spamming': 'major flooding',
    'major spamming': 'major flooding',
    'minor spam': 'minor spamming',
    'major spam': 'major flooding',
    'light spam': 'minor spamming',
    spam: 'minor spamming',
    '<13': 'underage',
    'under 13': 'underage',
    'inappropriate topics': 'sensitive topics',
    'major nsfw': 'nsfw',
    'minor nsfw': 'inappropriate media',
    pedo: 'pedophilia',
    alt: 'ban evasion',
    dismemberment: 'extreme gore'
};

export function calculateStrikeWeight(strike: Strike, cutoffDate: Date): number {
    // get days passed since cutoff
    const daysPassed = Math.floor((cutoffDate.getTime() - strike.at.getTime()) / (1000 * 60 * 60 * 24));

    // get the weight of the strike, adjusted for the amount of days
    const adjustedWeight = Math.max(strike.weight - Math.max(Math.floor((daysPassed + cutoff) / cutoff), 0), 0);
    return adjustedWeight;
}

export function calculateWeight(strikes: Strike[], cutoffDate: Date): number {
    return strikes.reduce((acc, strike) => acc + calculateStrikeWeight(strike, cutoffDate), 0);
}

async function timeout(config: any, member: Eris.Member, minutes: number) {
    const unixTimestamp = Math.floor(new Date().getTime() / 1000);
    const unixTimestampMinutes = unixTimestamp + minutes * 60;
    const iso8601 = new Date(unixTimestampMinutes * 1000).toISOString();

    await axios.patch(
        `https://discord.com/api/v9/guilds/${member.guild.id}/members/${member.id}`,
        JSON.stringify({
            communication_disabled_until: iso8601
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${config.token}`,
                'X-Audit-Log-Reason': 'Strike escalation'
            }
        }
    );
}

export async function issueStrike(
    bot: Eris.Client,
    config: any,
    db: PrismaClient,
    actor: string,
    reason: string,
    weight: number,
    member: Eris.Member
) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoff);

    const strike = await db.strike.create({
        data: {
            actor: actor,
            reason: reason,
            weight: weight,
            discordUser: {
                connectOrCreate: {
                    where: {
                        id: member.id
                    },
                    create: {
                        id: member.id
                    }
                }
            }
        }
    });

    const discordUser = await db.discordUser.findUnique({
        where: { id: member.id },
        include: { strikes: true }
    });

    const totalWeight = calculateWeight(discordUser.strikes, cutoffDate);

    // escalation
    let extra = 'given no extra punishment';
    if (totalWeight === 2) {
        await timeout(config, member, 3 * 60);
        extra = 'timed out for 3 hours';
    } else if (totalWeight === 3) {
        await timeout(config, member, 24 * 60);
        extra = 'timed out for 24 hours';
    } else if (totalWeight === 4) {
        await timeout(config, member, 24 * 3 * 60);
        extra = 'timed out for 3 days';
    } else if (totalWeight >= 5) {
        await member.ban(0, 'Strike escalation');
        extra = 'banned';
    }

    const modlogChannel = bot.getChannel(config.modlogChannel) as Eris.TextChannel;
    await modlogChannel.createMessage({
        embed: {
            title: `Strike #${strike.id} Issued`,
            color: 0xffa74a,
            fields: [
                {
                    name: 'Issued To',
                    value: `<@${strike.discordUserId}>`,
                    inline: true
                },
                {
                    name: 'Actor',
                    value: `<@${strike.actor}>`,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: strike.reason,
                    inline: true
                },
                {
                    name: 'Weight',
                    value: strike.weight.toString(),
                    inline: true
                },
                {
                    name: 'Issued',
                    value: `<t:${Math.floor(strike.at.getTime() / 1000)}:R>`,
                    inline: true
                },
                {
                    name: 'Extra Punishment',
                    value: extra[0].toUpperCase() + extra.slice(1),
                    inline: true
                }
            ]
        }
    });

    return extra;
}
