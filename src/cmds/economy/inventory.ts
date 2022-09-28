import items from '../../utils/economy/items';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    const wallet = await ctx.db.wallet.findUnique({ where: { id: ctx.msg.author.id } });
    if (!wallet) {
        return ctx.reply(ctx.config.emoji.error + " You don't have a wallet yet! Create one with `;createwallet`.");
    }

    const itemsFormatted = wallet.items.reduce<{ [id: string]: number }>((prev, cur) => {
        prev[cur] ??= 0;
        prev[cur]++;
        return prev;
    }, {});

    const vre = ctx.config.emoji.boxDrawing.verticalRightEnd;
    const itemInfo: string[] = [];

    for (const [id, quantity] of Object.entries(itemsFormatted)) {
        const item = items[id];
        itemInfo.push(`\`${id}\` - ${quantity}x ${item.pretty} ${item.limited ? '**LIMITED!**' : ''}\n${vre} ${item.description}`);
    }

    return ctx.reply(`📦 You currently have the following items:\n\n` + itemInfo.join('\n'));
}

export default {
    name: 'inventory',
    description: 'View your inventory.',
    usage: null,
    aliases: ['inv'],

    exec,
    level: 0
};
