import { CommandContext } from '../../types';

import items from '../../utils/economy/items';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const vr = ctx.config.emoji.boxDrawing.verticalRight;
    const vre = ctx.config.emoji.boxDrawing.verticalRightEnd;

    const itemInfo: string[] = [];

    for (const [id, item] of Object.entries(items)) {
        if (!item.purchasable) continue;

        let stock: number = undefined;

        if (item.stock !== undefined) {
            const itemDb = await ctx.db.item.findUnique({ where: { id } });
            if (itemDb?.stock === 0) continue;

            stock = itemDb?.stock ?? item.stock;
        }

        itemInfo.push(
            `\`${id}\` - ${item.pretty} ${item.limited ? '**LIMITED!**' : ''}\n${vr} We have ${
                stock > 0 ? stock.toLocaleString() : 'an infinite amount'
            } in stock.\n${vre} ${item.price.toLocaleString()} ${ctx.config.emoji.bottobux}`
        );
    }

    return ctx.reply(
        `${ctx.config.emoji.zantetsuMart} Welcome to ZANTETSUMART! We are currently selling the following items:\n\n` +
            itemInfo.join('\n') +
            '\n\nBuy one with `;buy <item id(1)>`! Use `;item <item id(1)>` to get more information.'
    );
}

export default {
    name: 'market',
    description: 'Browse ZANTETSUMART!',
    aliases: ['shop', 'zantetsumart'],
    usage: null,

    exec,
    level: 0
};
