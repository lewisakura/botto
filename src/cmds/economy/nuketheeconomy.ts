import { sendIRSNotice } from '../../utils/economy/irs';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.msg.channel.id !== ctx.config.economyChannel) return;

    const m = await ctx.reply(
        "☢️ The entire economy is about to be reset. You will not be able to recover anyone's funds or items once you do this. Reply with `Yes, fire the nukes!` to confirm."
    );
    const confirmation = await ctx.awaitMessages(ctx.msg.channel, msg => msg.author.id === ctx.msg.author.id, {
        time: 10000,
        maxMatches: 1
    });

    if (confirmation.length === 0 || confirmation[0].content !== 'Yes, fire the nukes!') {
        return m.edit(ctx.config.emoji.error + ' Cancelled.');
    }

    await m.edit(`${ctx.config.emoji.loading} Resetting economy...`);

    await ctx.db.$transaction([ctx.db.wallet.deleteMany(), ctx.db.item.deleteMany()]);

    sendIRSNotice(ctx, `☢️ ${ctx.msg.author.mention} nuked the economy.`);
    return ctx.reply(`${ctx.config.emoji.success} Poof!`);
}

export default {
    name: 'nuketheeconomy',
    description:
        "Resets the economy. For when someone finds a gamebreaking bug and doesn't report it. Again. Or just when it's time to reset.",
    usage: null,

    exec,
    level: 5
};
