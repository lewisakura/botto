import { CommandContext } from '../../types';
import { runCooldown } from '../../utils/cooldowns';

import items from '../../utils/economy/items';
import { sendIRSNotice } from '../../utils/economy/irs';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments.');
    }

    const itemId = ctx.args[0].toLowerCase();
    const item = items[itemId];
    if (!item) {
        return ctx.reply(ctx.config.emoji.error + ' No such item by that ID.');
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });
    if (!wallet) {
        return ctx.reply(ctx.config.emoji.error + " You don't have a wallet yet! Create one with `;createwallet`.");
    }

    if (!wallet.items.includes(itemId)) {
        return ctx.reply(ctx.config.emoji.error + ' You do not own this item.');
    }

    const cooldown = await runCooldown(ctx, 'sell', ctx.msg.author.id, 5, 'minutes');

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
            onHand: {
                increment: item.price / 4n
            },
            items: {
                set: newWalletItems
            }
        }
    });

    if (item.stock !== undefined) {
        await ctx.db.item.update({
            where: {
                id: itemId
            },
            data: {
                stock: {
                    increment: 1
                }
            }
        });
    }

    sendIRSNotice(
        ctx,
        `🛒 ${ctx.msg.author.mention} sold ${item.pretty} for ${(item.price / 4n).toLocaleString()} ${
            ctx.config.emoji.bottobux
        }.`
    );
    return ctx.reply(
        `${ctx.config.emoji.success} You have sold ${item.pretty} for ${(item.price / 4n).toLocaleString()} ${
            ctx.config.emoji.bottobux
        }!`
    );
}

export default {
    name: 'sell',
    description: 'Sell an item.',
    usage: '<item id(1)>',

    exec,
    level: 0
};
