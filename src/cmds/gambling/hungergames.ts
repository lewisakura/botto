import { sendIRSNotice } from '../../utils/economy/irs';
import { CommandContext } from '../../types';

import { districts, weapons } from '../../utils/hungerGames';
import { runCooldown } from '../../utils/cooldowns';
import { cryptoRandRange } from '../../utils/qrng';
import { delay, discordSnowflakeRegex } from '../../utils/general';

let gameRunning = false;

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.hungerGamesChannel) {
        if (ctx.userStaffLevel >= 2) {
            return ctx.reply('Are you looking for `;exploiterhungergames`, `;ehungergames`, or `;ehg`?');
        } else {
            return;
        }
    }

    if (ctx.args.length < 2) {
        let extra = '';

        if (ctx.userStaffLevel >= 2) {
            extra = '\n\n*You might be looking for `;exploiterhungergames`, `;ehungergames`, or `;ehg`.*';
        }

        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.' + extra);
    }

    const userIdRaw1 = ctx.args[0].match(discordSnowflakeRegex);
    if (!userIdRaw1) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }

    const userIdRaw2 = ctx.args[1].match(discordSnowflakeRegex);
    if (!userIdRaw2) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }

    const userId1 = userIdRaw1[1];
    const tribute1 = ctx.msg.channel.guild.members.find(m => m.id === userId1);
    if (!tribute1) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user 1.');
    }

    const userId2 = userIdRaw2[1];
    const tribute2 = ctx.msg.channel.guild.members.find(m => m.id === userId2);
    if (!tribute2) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user 2.');
    }

    if (gameRunning) return ctx.reply(ctx.config.emoji.error + ' A game is already running.');

    const cooldown = await runCooldown(ctx, 'hungergames', 'global', 30, 'minutes');

    if (cooldown) {
        return ctx.reply(
            `${ctx.config.emoji.error} The hunger games is on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`
        );
    }

    gameRunning = true;

    const tribute1District = await cryptoRandRange(1, 14);
    const tribute2District = await cryptoRandRange(1, 14);

    await ctx.reply(
        ctx.config.emoji.bottobux +
            " **PLACE YOUR BETS!** Send your bets in this format: `<tribute number> <bet>` (e.g., to bet 100 on tribute 1, you'd write `1 100`). Make sure your money is on hand first before betting! It's a 2x multiplier!\n\n" +
            'Tribute #1: ' +
            tribute1.mention +
            '\n' +
            'Tribute #2: ' +
            tribute2.mention
    );
    const bets = await ctx.awaitMessages(
        ctx.msg.channel,
        m => {
            const valid = !!m.content.match(/^(1|2) \d+$/);
            if (valid) {
                m.addReaction(ctx.config.emoji.bottobux.substring(2, ctx.config.emoji.bottobux.length - 1));
                return true;
            } else {
                return false;
            }
        },
        {
            maxMatches: Infinity,
            time: 30000
        }
    );

    const betMsg = await ctx.reply({
        content: ctx.config.emoji.loading + ' Processing bets, please wait...',
        messageReference: null
    });

    const badBets: string[] = [];
    const fixedBets: { id: string; who: number; bet: number }[] = [];
    for (const bet of bets) {
        const betInfo = bet.content.split(' ');

        const wallet = await ctx.db.wallet.findUnique({ where: { id: bet.author.id } });
        if (!wallet) {
            badBets.push(
                `<@${bet.author.id}>, you don't have a wallet! Create one with \`;createwallet\` in <#${ctx.config.economyChannel}>.`
            );
            continue;
        }

        const fixedBetInfo = {
            id: bet.author.id,
            who: parseInt(betInfo[0]),
            bet: parseInt(betInfo[1])
        };

        if (fixedBetInfo.bet <= 0) {
            badBets.push(`<@${bet.author.id}>, you can't bet nothing!`);
            continue;
        }
        if (fixedBetInfo.bet > 100000) {
            badBets.push(`<@${bet.author.id}>, you can't bet over 100,000!`);
            continue;
        }
        if (fixedBetInfo.bet > wallet.onHand) {
            badBets.push(`<@${bet.author.id}>, you don't have enough money on hand for that bet!`);
            continue;
        }

        const existingBet = fixedBets.find(fBet => fBet.id === bet.author.id);
        if (existingBet) {
            existingBet.who = parseInt(betInfo[0]);
            existingBet.bet = parseInt(betInfo[1]);
            continue;
        }

        fixedBets.push(fixedBetInfo);
    }

    await betMsg.edit(
        ctx.config.emoji.success +
            ' The following bets were placed:\n\n' +
            fixedBets
                .map(b => `<@${b.id}> on tribute #${b.who} for ${b.bet.toLocaleString()} ${ctx.config.emoji.bottobux}`)
                .join('\n') +
            '\n\nThe following bets were invalid:\n\n' +
            badBets.join('\n')
    );

    const transactions = [];
    for (const bet of fixedBets) {
        sendIRSNotice(
            ctx,
            `⚔️ <@${bet.id}> placed a bet of ${bet.bet.toLocaleString()} ${
                ctx.config.emoji.bottobux
            } on the hunger games.`
        );
        transactions.push(
            ctx.db.wallet.update({
                where: {
                    id: bet.id
                },
                data: {
                    onHand: {
                        decrement: bet.bet
                    }
                }
            })
        );
    }
    await ctx.db.$transaction(transactions);

    let msgContents = `**HUNGER GAMES**\n${tribute1.mention} (from District ${tribute1District} (${districts[tribute1District]})) vs ${tribute2.mention} (from District ${tribute2District} (${districts[tribute2District]}))\n**FIGHT!**\n\n`;
    let hungerGames = await ctx.reply({ content: msgContents, messageReference: null });

    async function appendToContent(msg: string) {
        if ((msgContents + msg).length > 2000) {
            hungerGames = await ctx.reply({ content: '[reserved]', messageReference: null });
            msgContents = '';
        }
        msgContents += msg;
        await hungerGames.edit(msgContents);
    }

    await delay(1000);

    let turn = 0;
    let tribute1Health = 100;
    let tribute2Health = 100;
    let winner: number;
    let winnerId: string;
    while (true) {
        turn++;

        const weapon1 = weapons[await cryptoRandRange(0, weapons.length - 1)];
        const damage1 = await weapon1.damage();

        await appendToContent(`__TURN ${turn}__\n${tribute1.mention} uses ${weapon1.name} for ${damage1} damage.\n`);
        tribute2Health -= damage1;

        if (tribute2Health <= 0) {
            await appendToContent(`${tribute2.mention} has died.`);
            winner = 1;
            winnerId = tribute1.id;
            break;
        }

        await delay(3000);

        const weapon2 = weapons[await cryptoRandRange(0, weapons.length - 1)];
        const damage2 = await weapon2.damage();

        await appendToContent(`${tribute2.mention} uses ${weapon2.name} for ${damage2} damage.\n`);
        tribute1Health -= damage2;

        if (tribute1Health <= 0) {
            await appendToContent(`${tribute1.mention} has died.`);
            winner = 2;
            winnerId = tribute2.id;
            break;
        }

        await delay(1000);
        await appendToContent(
            `\nFinal health: ${tribute1.mention} with ${tribute1Health} HP and ${tribute2.mention} with ${tribute2Health} HP\n\n`
        );
        await delay(5000);
    }

    const transactionsWin = [];
    for (const bet of fixedBets) {
        if (bet.who === winner) {
            sendIRSNotice(
                ctx,
                `⚔️ <@${bet.id}> won ${(bet.bet * 2).toLocaleString()} ${
                    ctx.config.emoji.bottobux
                } from the hunger games.`
            );
            transactionsWin.push(
                ctx.db.wallet.update({
                    where: {
                        id: bet.id
                    },
                    data: {
                        onHand: {
                            increment: bet.bet * 2
                        }
                    }
                })
            );
        }
    }
    await ctx.db.$transaction(transactionsWin);

    gameRunning = false;
}

export default {
    name: 'hungergames',
    description: 'Let the hunger games begin!',
    usage: '<tribute 1(1)> <tribute 2(1)>',
    aliases: ['hg'],

    exec,
    level: 0
};
