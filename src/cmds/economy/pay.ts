import dayjs from 'dayjs';
import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';
import { CommandContext } from '../../types';
import { discordSnowflakeRegex } from '../../utils/general';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    if (ctx.args.length < 2) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });

    if (!wallet) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have a wallet yet! Create one with \`;createwallet\`.`);
    }

    const userIdRaw = ctx.args[0].match(discordSnowflakeRegex);
    if (!userIdRaw) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }

    const userId = userIdRaw[1];
    const member = ctx.msg.channel.guild.members.find(m => m.id === userId);
    if (!member) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user.');
    }

    if (member.id === ctx.msg.author.id) {
        return ctx.reply('<:angr:864464764922232833>');
    }

    const wallet2 = await ctx.db.wallet.findUnique({ where: { id: member.id } });

    if (!wallet2) {
        return ctx.reply(
            `${ctx.config.emoji.error} That user does not have a wallet yet! Tell them to make one by running \`;createwallet\`.`
        );
    }

    const amount = Number(ctx.args[1]);
    if (isNaN(amount) || amount % 1 !== 0 || amount <= 0) {
        return ctx.reply(ctx.config.emoji.error + ' Amount must be a positive number.');
    }

    const bottobux = ctx.config.emoji.bottobux;

    /*if (amount > 10000) {
        return ctx.reply(
            `${ctx.config.emoji.error} You are attempting to transfer too much in one transaction. Transactions are limited to 10,000 ${bottobux}.`
        );
    }*/

    if (wallet.balance < amount) {
        return ctx.reply(`${ctx.config.emoji.error} You don't have enough in BANKUバンク to transfer this amount.`);
    }

    const cooldown = await runCooldown(ctx, 'pay', ctx.msg.author.id, 10, 'minutes');

    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    await ctx.db.$transaction([
        ctx.db.wallet.update({
            where: {
                id: ctx.msg.author.id
            },
            data: {
                balance: {
                    decrement: amount
                }
            }
        }),
        ctx.db.wallet.update({
            where: {
                id: member.id
            },
            data: {
                balance: {
                    increment: amount
                }
            }
        })
    ]);

    sendIRSNotice(ctx, `📫 ${ctx.msg.author.mention} paid ${member.mention} ${amount.toLocaleString()} ${bottobux}.`);
    return ctx.reply(`${ctx.config.emoji.success} You have paid ${member.mention} ${amount.toLocaleString()} ${bottobux}.`);
}

export default {
    name: 'pay',
    description: 'Pay some Bottobux to someone!',
    usage: '<user(1)> <amount(1)>',
    aliases: ['transfer'],

    exec,
    level: 0
};
