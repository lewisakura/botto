import { BanLog, ExploitLog, User } from '@prisma/client';
import axios from 'axios';
import dayjs from 'dayjs';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments');
    }

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Preparing report, please wait...');

    const username = ctx.args[0];
    const verbose = ctx.args.length > 1 ? ctx.args[1] === '-v' : false;

    const potentialRobloxUser = (await axios.get('https://api.roblox.com/users/get-by-username?username=' + username))
        .data;

    if (!potentialRobloxUser.Id) {
        return await msg.edit(ctx.config.emoji.error + ' Unknown user.');
    }

    const id = potentialRobloxUser.Id.toString();

    const robloxUserInfo = (await axios.get('https://users.roblox.com/v1/users/' + id)).data;
    const accountAge = dayjs().diff(dayjs(robloxUserInfo.created));

    let investigationResults = '**Investigation Results:**\n\n';
    const passed = ctx.config.emoji.success;
    const failed = ctx.config.emoji.error;
    const blank = ctx.config.emoji.blank;

    // pipes
    const vrs = ctx.config.emoji.boxDrawing.verticalRightStart;
    const vr = ctx.config.emoji.boxDrawing.verticalRight;
    const vre = ctx.config.emoji.boxDrawing.verticalRightEnd;

    const vros = ctx.config.emoji.boxDrawing.verticalRightOneShot;

    const vert = ctx.config.emoji.boxDrawing.vertical;

    if (username.toLowerCase() !== potentialRobloxUser.Username.toLowerCase()) {
        investigationResults +=
            'The user was found, but their Roblox account has a different username (`' +
            username +
            '` vs `' +
            potentialRobloxUser.Username +
            '`). This is fine if you know the user changed their username.\n\n';
    }

    if (accountAge < 90) {
        investigationResults +=
            "⚠️ This user's account is <90 days old (" +
            accountAge +
            ' days). This could be ' +
            'an alternative account, but this is not definitive proof.\n\n';
    }

    // get user data
    const userData =
        (await ctx.db.user.findUnique({
            where: {
                id
            },
            include: {
                exploitLogs: true,
                banLogs: true
            }
        })) ??
        ({ id: null, exploitLogs: [] as ExploitLog[], banLogs: [] as BanLog[] } as User & {
            exploitLogs: ExploitLog[];
            banLogs: BanLog[];
        });

    const filteredExploitLogs = userData.exploitLogs.filter(log => dayjs(log.at).isAfter(dayjs().subtract(14, 'days')));
    const decayedLogs = userData.exploitLogs.length - filteredExploitLogs.length;

    if (filteredExploitLogs.length === 0) {
        investigationResults += passed + ' User has no exploit logs.';
        if (verbose) {
            if (decayedLogs > 0) {
                investigationResults += '\n' + blank + vros + ` The user has ${decayedLogs} logs that are decayed.`;
            }
        }

        investigationResults += '\n\n';
    } else {
        let wasVeryNaughty = false;
        let veryNaughtyCount = 0;

        for (const log of filteredExploitLogs) {
            if (log.severity !== 'Silent Log') {
                wasVeryNaughty = true;
                veryNaughtyCount++;
            }
        }

        if (wasVeryNaughty) {
            let message: string;

            if (veryNaughtyCount >= 0 && veryNaughtyCount < 5) {
                message = 'By itself, this is not indicative of cheating, but is something to keep in mind.';
            } else if (veryNaughtyCount >= 5 && veryNaughtyCount < 15) {
                message = 'This player might be cheating.';
            } else if (veryNaughtyCount >= 15 && veryNaughtyCount < 25) {
                message = 'This player is very likely cheating.';
            } else if (veryNaughtyCount >= 25 && veryNaughtyCount < 50) {
                message = 'This player is almost definitely cheating.';
            } else {
                message = 'This player is cheating.';
            }

            investigationResults +=
                failed +
                ' User has ' +
                userData.exploitLogs.length +
                ' exploit logs that have not yet decayed. ' +
                message +
                '\n\n';
        } else {
            investigationResults += passed + ' User has no undecayed exploit logs.\n\n';
        }
    }

    if (userData.banLogs.length === 0) {
        investigationResults += passed + ' User has no ban logs.\n\n';
    } else {
        investigationResults += failed + ' User has ' + userData.banLogs.length + ' ban logs.\n';

        let temporary = 0;
        const tempReasons: string[] = [];
        let permanent = 0;
        const permReasons: string[] = [];

        let antiExploit = 0;

        for (const banLog of userData.banLogs) {
            if (banLog.actor === 'Server') {
                antiExploit++;
            } else {
                if (banLog.tempban) {
                    temporary++;
                    tempReasons.push(banLog.reason + ` (by \\@${banLog.actor})`);
                } else {
                    permanent++;
                    permReasons.push(banLog.reason + ` (by \\@${banLog.actor})`);
                }
            }
        }

        const manual = temporary + permanent;

        if (manual === 0) {
            investigationResults += blank + vrs + ' ' + passed + ' No manual bans.\n';
        } else {
            investigationResults += blank + vrs + ' ' + failed + ' ' + manual + ' manual bans.\n';

            if (temporary === 0) {
                investigationResults += blank + vert + blank + vrs + ' ' + passed + ' No temporary bans.\n';
            } else {
                investigationResults +=
                    blank + vert + blank + vrs + ' ' + failed + ' ' + temporary + ' temporary bans.\n';
                if (verbose) {
                    for (const reason of tempReasons) {
                        const char =
                            tempReasons.length === 1
                                ? vros
                                : tempReasons.indexOf(reason) === 0
                                ? vrs
                                : tempReasons.indexOf(reason) === tempReasons.length - 1
                                ? vre
                                : vr;

                        investigationResults += blank + vert + blank + vert + blank + char + ' ' + reason + '\n';
                    }
                }
            }

            if (permanent === 0) {
                investigationResults += blank + vert + blank + vre + ' ' + passed + ' No permanent bans.\n';
            } else {
                investigationResults +=
                    blank + vert + blank + vre + ' ' + failed + ' ' + permanent + ' permanent bans.\n';
                if (verbose) {
                    for (const reason of permReasons) {
                        const char =
                            permReasons.length === 1
                                ? vros
                                : permReasons.indexOf(reason) === 0
                                ? vrs
                                : permReasons.indexOf(reason) === permReasons.length - 1
                                ? vre
                                : vr;

                        investigationResults += blank + vert + blank + blank + blank + char + ' ' + reason + '\n';
                    }
                }
            }
        }

        if (antiExploit === 0) {
            investigationResults += blank + vre + ' ' + passed + ' No anti-exploit bans.\n\n';
        } else {
            investigationResults += blank + vre + ' ' + failed + ' ' + antiExploit + ' anti-exploit bans.\n\n';
        }
    }

    const final =
        investigationResults.length > 2000
            ? investigationResults.slice(0, 2000 - 11) + '...and more'
            : investigationResults;

    return await msg.edit(final);
}

export default {
    name: 'investigate',
    description: 'Investigates a Roblox user.',
    usage: '<roblox user(1)> <-v?>',

    exec,
    level: 1
};
