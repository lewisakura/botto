import 'global-agent/bootstrap';

import Eris, { GuildTextableChannel, Message, OldMessage } from 'eris';
import fsSync, { promises as fs } from 'fs';
import path from 'path';
import Express from 'express';
import EventEmitter from 'events';
import util from 'util';
import { exec as execSync } from 'child_process';
import { ews } from './utils/ews';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import cron from 'node-cron';
import axios from 'axios';
import _ from 'lodash';
import bodyParser from 'body-parser';
import urlRegex from 'url-regex';
import SpotifyWebApi from 'spotify-web-api-node';

import { PrismaClient } from '@prisma/client';

const exec = util.promisify(execSync);

import * as logger from './utils/logger';
import { CommandContext, RepliableContent } from './types';
import { getAwaitMessages } from './utils/awaitMessages';
import { sendIRSNotice } from './utils/economy/irs';
import { runCooldown, runCooldownNoCooldownium } from './utils/cooldowns';
import { getLevelForXp } from './utils/xp';
import { issueStrike, strikeWeightMap } from './utils/strike';

const config = JSON.parse(fsSync.readFileSync('./config.json', 'utf-8'));
const bot = new Eris.Client(config.token, { getAllUsers: true, intents: ['all'], restMode: true });

const spotifyApi = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret,
    redirectUri: config.spotify.redirectUri
});

try {
    const spotifyCreds = JSON.parse(fsSync.readFileSync('./spotify.json', 'utf-8'));
    spotifyApi.setAccessToken(spotifyCreds.accessToken);
    spotifyApi.setRefreshToken(spotifyCreds.refreshToken);
} catch {
    // ignored
}

const db = new PrismaClient();

const pollServerEmitter = new EventEmitter();
const serverCommands: any[] = [];

const awaitMessages = getAwaitMessages(bot);

const commands: {
    [key: string]: any;
} = {};

const transparencyInfo: {
    exploitLogsToday: number;

    banLogsToday: number;
    banLogsManual: number;
} = fsSync.existsSync('./transparency.json')
    ? JSON.parse(fsSync.readFileSync('./transparency.json', 'utf-8'))
    : {
          exploitLogsToday: 0,

          banLogsToday: 0,
          banLogsManual: 0
      };

dayjs.extend(relativeTime, {
    /*    thresholds: [
        { l: 's', r: 1 },
        { l: 'm', r: 1 },
        { l: 'mm', r: 59, d: 'minute' },
        { l: 'h', r: 1 },
        { l: 'hh', r: 23, d: 'hour' },
        { l: 'd', r: 1 },
        { l: 'dd', r: 29, d: 'day' },
        { l: 'M', r: 1 },
        { l: 'MM', r: 11, d: 'month' },
        { l: 'y' },
        { l: 'yy', d: 'year' }
    ] */
});

dayjs.extend(updateLocale);

dayjs.updateLocale('en', {
    relativeTime: {
        future: 'in %s',
        past: '%s ago',
        s: '%d seconds',
        m: 'a minute',
        mm: '%d minutes',
        h: 'an hour',
        hh: '%d hours',
        d: 'a day',
        dd: '%d days',
        M: 'a month',
        MM: '%d months',
        y: 'a year',
        yy: '%d years'
    }
});

const chatFilters = {
    words: {
        warnOnly: [/^n(i|1)gg?a$/gi, /^cr(a|@)ck(er|a)$/gi],
        racism: [/^spic$/gi, /^beaner$/gi],
        homophobia: [/^fag(got)?$/gi, /^dyke$/gi]
    },
    phrases: {
        racism: [/n(i|1)gger/gi]
    }
};

const startupWarnings: string[] = [];

const categories = fsSync.readdirSync(path.join(__dirname, 'cmds'));
for (const category of categories) {
    const categoryName = category
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.substring(1))
        .join(' ');

    logger.debug('loading category', categoryName);

    if (category.startsWith('-')) {
        logger.debug('ignoring category', categoryName, 'because it is disabled');
        continue;
    }

    const cmds = fsSync
        .readdirSync(path.join(__dirname, 'cmds', category))
        .filter(f => !f.endsWith('.map') && !f.startsWith('-'));

    logger.debug(categoryName, '(with', cmds.length, 'commands)');

    for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        const command = require(path.join(__dirname, 'cmds', category, cmd)).default;

        if (i === cmds.length - 1) {
            logger.debug('└', command.name);
        } else {
            logger.debug('├', command.name);
        }

        command.category = categoryName;

        if (commands[command.name])
            startupWarnings.push(
                `Duplicate command name \`${command.name}\` detected. This has been overwritten with the command located at \`${category}/${cmd}\`.`
            );

        commands[command.name] = command;
        if (command.aliases) {
            for (const alias of command.aliases) {
                if (commands[alias])
                    startupWarnings.push(
                        `Duplicate command name alias \`${alias}\` detected. This has been overwritten with the command located at \`${category}/${cmd}\`.`
                    );
                commands[alias] = command;
            }
        }
    }
}

bot.once('ready', async () => {
    // this is horrendous, but exists to try and go through as much cache as possible to avoid unnecessary requests,
    // but at some point there's just no point and we should fall back to getting the channel over REST
    const bottoMoment = (((
        bot.guilds.find(g => g.channels.get(config.bottoMomentChannel) !== null) ?? bot.guilds.get(config.itto)
    )?.channels.get(config.bottoMomentChannel) ??
        (await bot.getRESTChannel(config.bottoMomentChannel))) as GuildTextableChannel)!;

    const app = Express();

    app.use(bodyParser.text())
        .use((req, res, next) => {
            next();
            if (req.headers['user-agent'].toLowerCase().startsWith('roblox')) return;
            logger.debug(req.method, req.path, req.headers['user-agent'], '-', res.statusCode);
        })
        .get('/', (req, res) => {
            res.send({ message: 'This is the BOTTO helpline. How may we assist you today?' });
        })
        .get('/spotify', async (req, res) => {
            const code = req.query.code as string;

            if (!code) {
                res.status(400).send('Code missing');
                return;
            }

            const {
                body: { access_token, refresh_token }
            } = await spotifyApi.authorizationCodeGrant(code);

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);

            await fs.writeFile(
                './spotify.json',
                JSON.stringify({ accessToken: access_token, refreshToken: refresh_token })
            );

            res.send('Stored credentials');
        })
        .post('/deploy', async (req, res) => {
            res.send('<3');

            const msg = await bottoMoment.createMessage(config.emoji.loading + ' Installing...');

            try {
                await exec('git pull');
                await exec('yarn');
                await msg.edit(config.emoji.loading + ' Updating DB...');
                await exec('yarn prisma migrate deploy');
                await exec('yarn prisma generate');
                await msg.edit(config.emoji.loading + ' Building...');
                await exec('yarn build');
            } catch (e) {
                if (e.code !== undefined && e.code !== 0) {
                    return msg.edit(config.emoji.error + '```ansi\n' + e.stdout + '\n```');
                }
                return msg.edit(config.emoji.error + '```\n' + e.stack + '\n```');
            }
            await msg.edit(config.emoji.loading + ' Restarting...');
            await db.$disconnect();
            await fs.writeFile('./messageRestart.json', JSON.stringify(msg.id));
            await exec('pm2 restart botto');
        })

        // AUTHENTICATED ROUTES //
        .use((req, res, next) => {
            if (req.headers.authorization !== config.webApi.authKey) {
                res.status(401).send();
                return;
            }

            next();
        })

        .get('/poll-commands', (req, res) => {
            const dequeued = serverCommands.shift() ?? null;
            res.json(dequeued);
        })
        .post('/poll-commands/:id', (req, res) => {
            pollServerEmitter.emit('commandResponse', req.params.id, req.body);

            res.status(204).send();
        })

        .listen(config.webApi.port, () => logger.info('express started'));

    setInterval(async () => {
        await fs.writeFile('./transparency.json', JSON.stringify(transparencyInfo));
    }, 60000);
    logger.info('transparency info recovery set up');

    cron.schedule('0 0 * * *', async () => {
        const bottoMoment = bot.guilds
            .find(g => g.channels.get(config.bottoBulletinChannel) !== null)
            .channels.get(config.bottoBulletinChannel) as GuildTextableChannel;

        const vrs = config.emoji.boxDrawing.verticalRightStart;
        const vr = config.emoji.boxDrawing.verticalRight;
        const vre = config.emoji.boxDrawing.verticalRightEnd;

        const vros = config.emoji.boxDrawing.verticalRightOneShot;
        const v = config.emoji.boxDrawing.vertical;

        //const blank = config.emoji.blank;

        const [
            totalExploitLogs,
            totalBanLogs,
            totalUsers,
            banLogsAntiExploit,
            banLogsManual,
            [{ count: usersWithExploitLogs }],
            [{ count: usersWithDecayedExploitLogs }],
            [{ count: usersWithBanLogs }],
            [{ count: usersWithBoth }]
        ] = await db.$transaction([
            db.exploitLog.count(),
            db.banLog.count(),
            db.user.count(),

            db.banLog.count({ where: { actor: 'Server' } }),
            db.banLog.count({ where: { NOT: { actor: 'Server' } } }),

            db.$queryRaw`SELECT COUNT(*) FROM "User" AS U WHERE u.id IN
                (SELECT u2.id FROM "User" as u2 INNER JOIN "ExploitLog" AS el ON "el"."userId" = u2.id);`,
            db.$queryRaw`SELECT COUNT(*) FROM "User" AS U WHERE u.id IN
                (SELECT u2.id FROM "User" as u2 INNER JOIN "ExploitLog" AS el ON "el"."userId" = u2.id AND at < NOW() - INTERVAL '14 days');`,
            db.$queryRaw`SELECT COUNT(*) FROM "User" AS U WHERE u.id IN
                (SELECT u2.id FROM "User" as u2 INNER JOIN "BanLog" AS bl ON "bl"."userId" = u2.id);`,
            db.$queryRaw`SELECT COUNT(*) FROM "User" AS u WHERE u.id IN
                (SELECT u2.id FROM "User" as u2 INNER JOIN "ExploitLog" AS el ON "el"."userId" = u2.id)
            AND u.id IN
                (SELECT u2.id FROM "User" as u2 INNER JOIN "BanLog" AS bl ON "bl"."userId" = u2.id);`
        ]);

        const antiExploitBansToday = transparencyInfo.banLogsToday - transparencyInfo.banLogsManual;

        await bottoMoment.createMessage(`**Transparency Report**

Welcome back to your midnightly UTC transparency report!

${totalExploitLogs} exploit logs are currently stored.
${vrs} ${transparencyInfo.exploitLogsToday} were added today.
${vre} Overall, there has been an increase of ${transparencyInfo.exploitLogsToday} exploit logs.

${totalBanLogs} ban logs are currently stored.
${vrs} ${transparencyInfo.banLogsToday} were added today.
${v}${vrs} Of which, ${transparencyInfo.banLogsManual} were issued by moderators. ${
            transparencyInfo.banLogsManual > 0 ? 'Good job, moderators!' : ''
        }
${v}${vre} Of which, ${antiExploitBansToday} were issued by the anti-exploit. ${
            antiExploitBansToday > 0 ? 'Good job, Tampered!' : ''
        }
${vr} ${banLogsAntiExploit} were issued by the anti-exploit.
${vre} ${banLogsManual} were issued by moderators.

${totalUsers} users are currently stored.
${vrs} ${usersWithExploitLogs} have at least one exploit log.
${v}${vros} ${usersWithDecayedExploitLogs} have only decayed exploit logs.
${vr} ${usersWithBanLogs} have at least one ban log.
${vre} ${usersWithBoth} have at least one of both.

This has been your transparency report. I'll see you in 24 hours.
`);

        transparencyInfo.banLogsManual = 0;
        transparencyInfo.banLogsToday = 0;
        transparencyInfo.exploitLogsToday = 0;
        await fs.writeFile('./transparency.json', JSON.stringify(transparencyInfo));
    });
    logger.info('transparency report set up');

    cron.schedule('*/15 * * * * *', async () => {
        const accountsWithLoans = await db.wallet.findMany({ where: { loan: { gt: 0 } } });

        for (const wallet of accountsWithLoans) {
            if (dayjs(wallet.loanPaybackDate).isBefore(dayjs())) {
                const fine = Math.floor(Number(wallet.loan) * (1 + 20 / 100));
                let loanDecrement = Math.max(Number(wallet.loan / 2n), 1000);

                if (Number(wallet.maxLoan) - loanDecrement < 100) {
                    loanDecrement = Number(wallet.maxLoan) - 100;
                }

                await db.wallet.update({
                    where: {
                        id: wallet.id
                    },
                    data: {
                        balance: {
                            decrement: fine
                        },
                        loan: 0,
                        loanPaybackDate: null,
                        maxLoan: {
                            decrement: loanDecrement
                        }
                    }
                });

                sendIRSNotice(
                    config.internalRevenueService,
                    `🏦 <@${wallet.id}> was fined ${fine.toLocaleString()} ${
                        config.emoji.bottobux
                    } by BANKUバンク for failing to return their loan. Their maximum loan is now ${(
                        wallet.maxLoan - BigInt(loanDecrement)
                    ).toLocaleString()} ${config.emoji.bottobux}.`
                );

                const economyChannel = bot.guilds
                    .find(g => g.channels.get(config.economyChannel) !== null)
                    .channels.get(config.economyChannel) as GuildTextableChannel;

                await economyChannel.createMessage(
                    `🏦 <@${wallet.id}>, BANKUバンク has fined you ${fine.toLocaleString()} ${
                        config.emoji.bottobux
                    } for failing to pay back your loan on time. You can now only take out a loan of ${(
                        wallet.maxLoan - BigInt(loanDecrement)
                    ).toLocaleString()} ${
                        config.emoji.bottobux
                    } until you start paying back your loans properly and constantly.`
                );

                await runCooldown({ db }, 'takeloan', wallet.id, 1, 'hour');
            }
        }
    });
    logger.info('loan expiry set up');

    cron.schedule('* * * * *', async () => {
        for (const sticky of await db.sticky.findMany()) {
            const channel = bot.getChannel(sticky.channelId) as Eris.TextChannel;
            if (channel.lastMessageID !== sticky.lastMessageId) {
                bot.deleteMessage(sticky.channelId, sticky.lastMessageId).catch(() => {}); // dont bother waiting

                const msg = await bot.createMessage(sticky.channelId, sticky.messageContent);
                await db.sticky.update({
                    where: {
                        id: sticky.id
                    },
                    data: {
                        lastMessageId: msg.id
                    }
                });
            }
        }
    });
    logger.info('stickies set up');

    logger.debug('ready');

    try {
        const restartMessageId = JSON.parse(await fs.readFile('./messageRestart.json', 'utf-8'));
        // deepscan-disable-next-line NULL_POINTER
        const restartMessage = await bottoMoment.getMessage(restartMessageId);

        if (restartMessage) {
            if (startupWarnings.length > 0) {
                await restartMessage.edit(
                    config.emoji.success +
                        ' Back online!\n\n⚠️ The following warnings were encountered during startup:\n' +
                        startupWarnings.join('\n')
                );
            } else {
                await restartMessage.edit(config.emoji.success + ' Back online!');
            }
            await fs.rm('./messageRestart.json');
        }
    } catch {
        // no big deal if this fails
    }

    bot.editStatus('online', {
        name: 'ZOぞ',
        type: 0
    });
});

function getUserStaffLevel(m: Eris.Member) {
    let userLevel = 0;

    for (const role of Object.keys(config.levels)) {
        const level = config.levels[role];
        if (m.roles.includes(role) && userLevel < level) {
            userLevel = level;
        }
    }

    for (const devId of config.devs) {
        if (m.id === devId) {
            userLevel = 5;
            break;
        }
    }

    return userLevel;
}

bot.on('messageCreate', async (msg: Eris.Message<Eris.GuildTextableChannel>) => {
    if (msg.channel.id === config.exploitLogsChannel) {
        if (msg.embeds.length > 0) {
            const embed = msg.embeds[0];
            const username = embed.fields[0].value;

            const id = embed.fields[1].value.match(/\[.*\]\(https:\/\/www.roblox.com\/users\/(\d+)\/profile\/?\)/)[1];

            await db.exploitLog.create({
                data: {
                    username,
                    reason: embed.fields[2].value,
                    severity: embed.fields[3].value,
                    user: {
                        connectOrCreate: {
                            where: {
                                id
                            },
                            create: {
                                id
                            }
                        }
                    }
                }
            });

            transparencyInfo.exploitLogsToday++;
            return;
        }
    }

    if (msg.channel.id === config.banLogsChannel) {
        if (msg.embeds.length > 0) {
            const embed = msg.embeds[0];

            const [_, username, id] = embed.fields[1].value.match(
                /\[(.*)\]\(https:\/\/www.roblox.com\/users\/(\d+)\/profile\/?\)/
            );

            let data: any = null;

            if (embed.fields.length === 4 && embed.fields[3].name === 'Severity') {
                data = {
                    username,
                    actor: 'Server',
                    reason: embed.fields[2].value
                };
            } else if (embed.fields.length === 4 && embed.fields[2].name === 'Time') {
                data = {
                    username,
                    actor: embed.fields[0].value.match(/^\[(.*)\]/)[1],
                    reason: embed.fields[3].value,
                    tempban: true
                };
            } else if (embed.fields.length === 3) {
                data = {
                    username,
                    actor: embed.fields[0].value.match(/^\[(.*)\]/)[1],
                    reason: embed.fields[2].value
                };
            } // ignore unbans

            if (data) {
                await db.banLog.create({
                    data: {
                        ...data,
                        user: {
                            connectOrCreate: {
                                where: {
                                    id
                                },
                                create: {
                                    id
                                }
                            }
                        }
                    }
                });

                transparencyInfo.banLogsToday++;
                if (data.actor !== 'Server') transparencyInfo.banLogsManual++;
            }

            return;
        }
    }

    if (msg.author.bot) return;
    if (msg.channel instanceof Eris.PrivateChannel) return;

    // assure existence of discord users before doing anything
    await db.discordUser.upsert({ create: { id: msg.author.id }, update: {}, where: { id: msg.author.id } });

    const userStaffLevel = getUserStaffLevel(msg.member);

    // word filtering
    // mgmt+ are exempt
    if (userStaffLevel < 1 && !config.ticketCategories.includes(msg.channel.parentID)) {
        for (const [reason, filter] of Object.entries(chatFilters.phrases)) {
            for (const phrase of filter) {
                if (msg.content.match(phrase)) {
                    await Promise.all([
                        msg.delete('word filter triggered'),
                        issueStrike(bot, config, db, bot.user.id, reason, strikeWeightMap[reason], msg.member)
                    ]);
                    return;
                }
            }
        }

        let alreadyWarned = false;
        const words = msg.content.split(' ');

        for (const [reason, filter] of Object.entries(chatFilters.words)) {
            for (const word of words) {
                for (const f of filter) {
                    if (word.match(f)) {
                        if (reason === 'warnOnly') {
                            if (!alreadyWarned) {
                                await msg.channel.createMessage({
                                    content: 'Mind your language!',
                                    messageReference: {
                                        messageID: msg.id
                                    }
                                });
                                alreadyWarned = true;
                            }
                            continue;
                        }

                        await Promise.all([
                            msg.delete('word filter triggered'),
                            issueStrike(bot, config, db, bot.user.id, reason, strikeWeightMap[reason], msg.member)
                        ]);
                        return;
                    }
                }
            }
        }
    }

    if (msg.channel.id === config.skinsChannel) {
        const matches = msg.content.match(
            /^Name *: *(.+)\n(?:Base )?Weapon *: *.+\nDescription *: *.+\n(?:Suggested )?(?:Souls|Price|Cost) *: *.+/i
        );
        if (!matches) {
            if (userStaffLevel < 1) {
                await axios.post(
                    `https://discord.com/api/v9/channels/${config.skinsDiscussionThread}/messages`,
                    JSON.stringify({
                        content: `${
                            msg.author.mention
                        }, please keep discussions regarding skins in this thread or in the thread relating to the skin.\n*If you weren't starting a discussion, you need to use the format without altering it!*\n\n${msg.content.replace(
                            urlRegex({ exact: false }),
                            '[CENSORED]'
                        )}`,
                        allowed_mentions: {
                            users: [msg.author.id]
                        }
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bot ${config.token}`
                        }
                    }
                );

                await msg.delete();
                return;
            }
        } else {
            await msg.addReaction(config.emoji.success.substring(1, config.emoji.success.length - 1));
            await msg.addReaction(config.emoji.error.substring(1, config.emoji.error.length - 1));

            let threadName = 'Skin Discussion - ' + matches[1];
            if (threadName.length > 100) threadName = threadName.substring(0, 97) + '...';

            await axios.post(
                `https://discord.com/api/v9/channels/${config.skinsChannel}/messages/${msg.id}/threads`,
                JSON.stringify({
                    name: threadName,
                    auto_archive_duration: 60
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bot ${config.token}`
                    }
                }
            );
        }
    }

    if (msg.channel.id === config.clanRecruitmentChannel) {
        const matches = msg.content.match(/^(?:(?:Clan )?Name) *: *(.+)\n(?:Clan )?Description *: *.+/i);
        if (!matches) {
            if (userStaffLevel < 1) {
                await msg.delete();
                return;
            }
        } else {
            let threadName = 'Clan Recruitment Discussion - ' + matches[1];
            if (threadName.length > 100) threadName = threadName.substring(0, 97) + '...';

            await axios.post(
                `https://discord.com/api/v9/channels/${config.clanRecruitmentChannel}/messages/${msg.id}/threads`,
                JSON.stringify({
                    name: threadName,
                    auto_archive_duration: 60
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bot ${config.token}`
                    }
                }
            );
        }
    }

    if (msg.channel.id === config.feedbackChannel) {
        const matches = msg.content.match(/^(?:Feedback|Suggestion)/i);
        if (!matches) {
            if (userStaffLevel < 1) {
                await axios.post(
                    `https://discord.com/api/v9/channels/${config.feedbackDiscussionThread}/messages`,
                    JSON.stringify({
                        content: `${
                            msg.author.mention
                        }, please keep discussions regarding feedback in this thread or in the thread relating to the feedback.\n*If you weren't starting a discussion, you need to use the format without altering it!*\n\n${msg.content.replace(
                            urlRegex({ exact: false }),
                            '[CENSORED]'
                        )}`,
                        allowed_mentions: {
                            users: [msg.author.id]
                        }
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bot ${config.token}`
                        }
                    }
                );

                await msg.delete();
                return;
            }
        } else {
            await msg.addReaction(config.emoji.success.substring(1, config.emoji.success.length - 1));
            await msg.addReaction(config.emoji.error.substring(1, config.emoji.error.length - 1));

            let threadName = 'Feedback Discussion - ' + msg.id;
            if (threadName.length > 100) threadName = threadName.substring(0, 97) + '...';

            await axios.post(
                `https://discord.com/api/v9/channels/${config.feedbackChannel}/messages/${msg.id}/threads`,
                JSON.stringify({
                    name: threadName,
                    auto_archive_duration: 60
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bot ${config.token}`
                    }
                }
            );
        }
    }

    if (msg.channel.id === config.penaltyAdjustmentsChannel) {
        const matches = msg.content.match(
            /^Player's Username:? *(.+)\n(?:Proof|Explanation|Proof\/Explanation):? *.+\nPenalty Adjustment(?: \[Increased\/Decreased\]):? *.+/i
        );
        if (!matches) {
            await msg.channel
                .createMessage(`${msg.author.mention}, please use the format provided in the channel description.`)
                .then(m => {
                    setTimeout(() => m.delete(), 10000);
                });

            await msg.delete();
            return;
        } else {
            let threadName = 'Penalty Adjustment Discussion - ' + matches[1];
            if (threadName.length > 100) threadName = threadName.substring(0, 97) + '...';

            await axios.post(
                `https://discord.com/api/v9/channels/${config.penaltyAdjustmentsChannel}/messages/${msg.id}/threads`,
                JSON.stringify({
                    name: threadName,
                    auto_archive_duration: 60
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bot ${config.token}`
                    }
                }
            );
        }
    }

    if (msg.channel.parentID && msg.channel.parentID === config.ticketsCategory && getUserStaffLevel(msg.member) < 1) {
        // rk/sk ticket check
        const filtersIndividual = [
            'rk',
            'sk',
            'rking',
            'sking',
            'rker',
            'sker',
            'rked',
            'sked',
            'randomkilling',
            'spawnkilling',
            'randomkiller',
            'spawnkiller',
            'randomkill',
            'spawnkill'
        ];

        const filtersPhrases = ['random kill', 'spawn kill', 'randomly kill'];

        const words = msg.content.toLowerCase().split(' ');

        const message =
            '<a:stressed:860792356836212736> It appears your ticket is about someone randomly killing or spawn killing. ' +
            "ZOぞ is a game about killing people, and random/spawn killing is not against the game's rules.\n\n" +
            '*If your ticket is not about this, you can ignore this message.*';

        for (const word of words) {
            for (const filteredWord of filtersIndividual) {
                if (word === filteredWord) {
                    await msg.channel.createMessage({
                        content: message,
                        messageReference: {
                            messageID: msg.id
                        },
                        allowedMentions: {
                            repliedUser: false
                        }
                    });
                    return;
                }
            }
        }

        for (const filteredPhrase of filtersPhrases) {
            if (msg.content.toLowerCase().includes(filteredPhrase)) {
                await msg.channel.createMessage({
                    content: message,
                    messageReference: {
                        messageID: msg.id
                    },
                    allowedMentions: {
                        repliedUser: false
                    }
                });
                return;
            }
        }
    }

    if (msg.content.startsWith(config.prefix)) {
        const args = msg.content.substring(config.prefix.length).split(' ');

        const commandDesired = args.shift();
        const command = commands[commandDesired];

        if (command) {
            logger.info(`${msg.member.username}#${msg.member.discriminator}`, 'executed command', msg.content);

            try {
                const ctx = {
                    args,
                    bot,
                    logger,
                    msg,
                    db,
                    pollServerEmitter,
                    serverCommands,
                    commands,
                    config,

                    spotifyApi,

                    userStaffLevel,
                    getUserStaffLevel,

                    awaitMessages,

                    reply(content: RepliableContent, channel?: string) {
                        let properContent = content as Eris.AdvancedMessageContent;

                        if (properContent.constructor !== Object && properContent.constructor !== Array) {
                            // stringify it if it's not an object
                            properContent = { content: properContent.toString() };
                        } else {
                            if (
                                !properContent.content &&
                                !properContent.embed &&
                                !(properContent as { file: Eris.FileContent | Eris.FileContent[] }).file
                            ) {
                                properContent = {
                                    content: `\`\`\`json\n${JSON.stringify(properContent, null, 4)}\n\`\`\``
                                };
                            }
                        }

                        const file =
                            (properContent as { file: Eris.FileContent | Eris.FileContent[] }).file || undefined;
                        delete (properContent as { file: Eris.FileContent | Eris.FileContent[] }).file;

                        if (channel) {
                            return (
                                msg.channel.guild.channels.find(c => c.id === channel) as Eris.TextableChannel
                            ).createMessage(
                                _.merge(
                                    {
                                        allowedMentions: {
                                            repliedUser: false
                                        }
                                    },
                                    properContent
                                ),
                                file
                            );
                        }

                        return msg.channel.createMessage(
                            _.merge(
                                {
                                    messageReference: {
                                        messageID: msg.id
                                    },
                                    allowedMentions: {
                                        repliedUser: false
                                    }
                                },
                                properContent
                            ),
                            file
                        );
                    }
                } as CommandContext;

                if (userStaffLevel >= command.level) {
                    return await command.exec(ctx);
                } else {
                    return await ctx.reply(
                        `${config.emoji.error} You do not have the required permissions to execute this command (need staff level ${command.level}, you are staff level ${userStaffLevel}).`
                    );
                }
            } catch (e) {
                logger.error('Error in', command.name, '\n', e);
                return await msg.channel.createMessage({
                    content:
                        config.emoji.error +
                        ' A fatal error occurred during the execution of this command.\n```typescript\n' +
                        e +
                        '\n```',
                    messageReference: {
                        messageID: msg.id
                    },
                    allowedMentions: {
                        repliedUser: false
                    }
                });
            }
        }
    }

    // xp code
    if (config.xpChannels.includes(msg.channel.id)) {
        const xpCooldown = runCooldownNoCooldownium('xpGain', msg.author.id, 5, 'minutes');
        if (xpCooldown) return;

        if (!msg.content) return; // if its an image or just a sticker or something there is no xp gain

        const previousXp = (await db.discordUser.findUnique({ where: { id: msg.author.id }, select: { xp: true } })).xp;

        const xpGain = Math.min(Math.ceil((msg.content.length / 10) ** 2), 30);
        const finalUser = await db.discordUser.update({
            where: { id: msg.author.id },
            data: { xp: { increment: xpGain } }
        });

        const oldLevel = getLevelForXp(previousXp);
        const newLevel = getLevelForXp(finalUser.xp);

        if (newLevel > oldLevel) {
            // go through the object and check if any old rewards need to be issued
            // e.g., if the user hits level 5, any rewards for level 1, 2, 3, and 4 need to be issued
            const rewardsToBeIssued: string[] = [];

            for (const level of Object.keys(config.levelRewards)) {
                const l = parseInt(level);
                if (l > newLevel) break;

                const roleId = config.levelRewards[level];
                if (msg.member.roles.includes(roleId)) continue;
                rewardsToBeIssued.push(roleId);
            }

            let rewards = '';

            if (rewardsToBeIssued.length > 0) {
                for (const roleId of rewardsToBeIssued) {
                    await msg.member.addRole(roleId, 'level up!');
                    rewards += `<@&${roleId}>\n`;
                }
            }

            msg.channel
                .createMessage({
                    embed: {
                        description: `🆙 ${oldLevel} → **${newLevel}**${
                            rewards ? `\n\nYou have earned:\n${rewards}` : ''
                        }`,
                        color: 0x63ffcb
                    },
                    messageReference: {
                        messageID: msg.id
                    }
                })
                .then(msg => new Promise((res: (value: Eris.Message) => void) => setTimeout(() => res(msg), 5000)))
                .then(msg => msg.delete());
        }
    }
});

bot.on('messageUpdate', async (msg: Message<GuildTextableChannel>, old: OldMessage) => {
    if (old === null) {
        msg = (await bot.getMessage(msg.channel.id, msg.id)) as Message<GuildTextableChannel>;
    }

    const userStaffLevel = getUserStaffLevel(msg.member);

    // word filtering
    // mgmt+ are exempt
    if (userStaffLevel < 1 && !config.ticketCategories.includes(msg.channel.parentID)) {
        for (const [reason, filter] of Object.entries(chatFilters.phrases)) {
            for (const phrase of filter) {
                if (msg.content.match(phrase)) {
                    await Promise.all([
                        msg.delete('word filter triggered'),
                        issueStrike(bot, config, db, bot.user.id, reason, strikeWeightMap[reason], msg.member)
                    ]);
                    return;
                }
            }
        }

        let alreadyWarned = false;
        const words = msg.content.split(' ');

        for (const [reason, filter] of Object.entries(chatFilters.words)) {
            for (const word of words) {
                for (const f of filter) {
                    if (word.match(f)) {
                        if (reason === 'warnOnly') {
                            if (!alreadyWarned) {
                                await msg.channel.createMessage({
                                    content: 'Mind your language!',
                                    messageReference: {
                                        messageID: msg.id
                                    }
                                });
                                alreadyWarned = true;
                            }
                            continue;
                        }

                        await Promise.all([
                            msg.delete('word filter triggered'),
                            issueStrike(bot, config, db, bot.user.id, reason, strikeWeightMap[reason], msg.member)
                        ]);
                        return;
                    }
                }
            }
        }
    }
});

bot.on('guildMemberUpdate', async (g, m, oldM) => {
    for (const ewsConds of ews) {
        if (ewsConds.on === 'update' && ewsConds.sendIf(m, oldM)) {
            await (
                m.guild.channels.find(c => c.id === config.bottoBulletinChannel) as Eris.GuildTextableChannel
            ).createMessage('⚠️ EWS notification: ' + ewsConds.message(m));
        }
    }
});

bot.on('guildMemberAdd', async (g, m) => {
    await db.discordUser.upsert({ create: { id: m.id }, update: {}, where: { id: m.id } });
});

try {
    bot.connect();
} catch {
    // ignore it, it will auto reconnect
}
