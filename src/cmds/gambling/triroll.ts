import dayjs from 'dayjs';
import { CommandContext } from '../../types';
import { runCooldown } from '../../utils/cooldowns';
import { cryptoRandRange } from '../../utils/qrng';
import { sendIRSNotice } from '../../utils/economy/irs';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const amount = Number(ctx.args[0]);
    if (isNaN(amount) || amount % 1 !== 0 || amount <= 0) {
        return ctx.reply(ctx.config.emoji.error + ' Amount must be a positive number.');
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    if (wallet.onHand < amount) {
        return ctx.reply(ctx.config.emoji.error + ' You do not have enough on hand for this gamble!');
    }

    const cooldown = await runCooldown(ctx, 'triroll', ctx.msg.author.id, 15, 'minutes');

    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    await ctx.db.wallet.update({
        where: {
            id: ctx.msg.author.id
        },
        data: {
            onHand: {
                decrement: amount
            }
        }
    });

    const bottobux = ctx.config.emoji.bottobux;

    sendIRSNotice(ctx, `📫 ${ctx.msg.author.mention} paid ${amount.toLocaleString()} ${bottobux} for a bet.`);

    const winLose = (await cryptoRandRange(1, 10)) <= 9;
    if (!winLose) {
        return ctx.reply(
            ctx.config.emoji.error +
                " The dice rolled off the table, but the casino won't let you play without placing another bet."
        );
    }

    const d6 = async () => await cryptoRandRange(1, 6);

    const dice = await Promise.all([d6(), d6(), d6()]);

    let multiplier = 0;
    for (const die of dice) {
        if (die === 6) {
            multiplier += 2;
        }
    }

    if (dice[0] === dice[1] && dice[1] === dice[2]) {
        multiplier += 3;
    }

    const rolled = `🎲 Rolled ${dice.map(v => `**${v}**`).join(', ')}`;

    if (multiplier > 0) {
        multiplier++;
        const winnings = amount * multiplier;
        await ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                onHand: {
                    increment: winnings
                }
            }
        });
        sendIRSNotice(
            ctx,
            `🎲 ${ctx.msg.author.mention} won ${winnings.toLocaleString()} ${bottobux} by using \`;triroll\`.`
        );
        return ctx.reply(`${rolled}\n${ctx.config.emoji.success} You won ${winnings.toLocaleString()} ${bottobux}!`);
    } else {
        return ctx.reply(`${rolled}\n${ctx.config.emoji.error} You lost!`);
    }
}

export default {
    name: 'triroll',
    description: 'Throw three dice and pray.',
    usage: '<amount(1)>',
    aliases: ['roll'],

    exec,
    level: 0
};
