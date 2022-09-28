import items from '../../utils/economy/items';
import { CommandContext } from '../../types';

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

    let stock: number = undefined;

    if (item.stock !== undefined) {
        const itemDb = await ctx.db.item.findUnique({ where: { id: itemId } });
        stock = itemDb?.stock ?? item.stock;
    }

    return ctx.reply({
        embed: {
            title: `${item.pretty} ${item.limited ? '**LIMITED!**' : ''}`,
            description: item.description,
            color: 0xe7ae54,
            fields: [
                {
                    name: 'Price',
                    value: `${item.price.toLocaleString()} ${ctx.config.emoji.bottobux}`
                },
                {
                    name: 'Resell Price',
                    value: `${(item.price / 4n).toLocaleString()} ${ctx.config.emoji.bottobux}`
                },
                {
                    name: 'Tradeable',
                    value: item.tradeable ? 'Yes' : 'No'
                },
                {
                    name: 'Stock',
                    value: item.stock !== undefined ? `${stock.toLocaleString()}/${item.stock.toLocaleString()}` : 'Unlimited'
                }
            ]
        }
    });
}

export default {
    name: 'item',
    description: 'Get item information',
    usage: '<item id(1)>',

    exec,
    level: 0
};
