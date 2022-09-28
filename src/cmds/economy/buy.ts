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

    if (!item.purchasable) {
        return ctx.reply(ctx.config.emoji.error + ' This item is not for sale.');
    }

    if (item.stock !== undefined) {
        const itemDb = await ctx.db.item.upsert({
            where: {
                id: itemId
            },
            update: {
                stock: {
                    decrement: 1
                }
            },
            create: {
                id: itemId,
                stock: item.stock - 1
            }
        });

        if (itemDb.stock <= -1) {
            // because if we're at 0 stock, then when we get it we'll get -1
            await ctx.db.item.update({
                where: {
                    id: itemId
                },
                data: {
                    stock: {
                        increment: 1 // because we decrement 1 when we get the data
                    }
                }
            });
            return ctx.reply(ctx.config.emoji.error + ' This item is out of stock.');
        }
    }

    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });
    if (!wallet) {
        if (item.stock !== undefined) {
            await ctx.db.item.update({
                where: {
                    id: itemId
                },
                data: {
                    stock: {
                        increment: 1 // because we decrement 1 when we get the data
                    }
                }
            });
        }
        return ctx.reply(ctx.config.emoji.error + " You don't have a wallet yet! Create one with `;createwallet`.");
    }

    if (wallet.onHand < item.price) {
        if (item.stock !== undefined) {
            await ctx.db.item.update({
                where: {
                    id: itemId
                },
                data: {
                    stock: {
                        increment: 1 // because we decrement 1 when we get the data
                    }
                }
            });
        }
        return ctx.reply(ctx.config.emoji.error + " You don't have enough money on hand for this item.");
    }

    const cooldown = await runCooldown(ctx, 'buy', ctx.msg.author.id, 5, 'minutes');

    if (cooldown) {
        if (item.stock !== undefined) {
            await ctx.db.item.update({
                where: {
                    id: itemId
                },
                data: {
                    stock: {
                        increment: 1 // because we decrement 1 when we get the data
                    }
                }
            });
        }
        return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
    }

    await ctx.db.wallet.update({
        where: {
            id: ctx.msg.author.id
        },
        data: {
            onHand: {
                decrement: item.price
            },
            items: {
                push: itemId
            }
        }
    });

    sendIRSNotice(
        ctx,
        `🛒 ${ctx.msg.author.mention} bought ${item.pretty} for ${item.price.toLocaleString()} ${
            ctx.config.emoji.bottobux
        }.`
    );
    return ctx.reply(
        `${ctx.config.emoji.success} You have purchased ${item.pretty} for ${item.price.toLocaleString()} ${
            ctx.config.emoji.bottobux
        }!`
    );
}

export default {
    name: 'buy',
    description: 'Purchase an item from ZANTETSUMART.',
    aliases: ['purchase'],
    usage: '<item id(1)>',

    exec,
    level: 0
};
