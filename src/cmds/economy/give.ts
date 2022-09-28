import dayjs from 'dayjs';
import { runCooldown } from '../../utils/cooldowns';
import { sendIRSNotice } from '../../utils/economy/irs';
import items from '../../utils/economy/items';
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

    const itemId = ctx.args[1].toLowerCase();
    const item = items[itemId];
    if (!item) {
        return ctx.reply(ctx.config.emoji.error + ' No such item by that ID.');
    }

    if (!wallet.items.includes(itemId)) {
        return ctx.reply(ctx.config.emoji.error + ' You do not own this item.');
    }

    if (!item.tradeable) {
        return ctx.reply(ctx.config.emoji.error + ' This item cannot be traded.');
    }

    const cooldown = await runCooldown(ctx, 'give', ctx.msg.author.id, 10, 'minutes');

    if (cooldown) {
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    const newWalletItems = [...wallet.items];
    newWalletItems.splice(newWalletItems.indexOf(itemId), 1);

    await ctx.db.wallet.update({
        where: {
            id: ctx.msg.author.id
        },
        data: {
            items: {
                set: newWalletItems
            }
        }
    });

    await ctx.db.wallet.update({
        where: {
            id: member.id
        },
        data: {
            items: {
                push: itemId
            }
        }
    });

    sendIRSNotice(ctx, `➡️ ${ctx.msg.author.mention} gave ${member.mention} ${item.pretty}.`);
    return ctx.reply(`${ctx.config.emoji.success} You have given ${member.mention} ${item.pretty}.`);
}

export default {
    name: 'give',
    description: 'Give items to someone!',
    usage: '<user(1)> <item id(1)>',
    aliases: ['trade'],

    exec,
    level: 0
};
