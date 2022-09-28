import { CommandContext } from '../../types';

export default {
    name: 'say',
    description: 'Says a message!',
    usage: '<message...>',

    async exec(ctx: CommandContext) {
        if (ctx.args.length < 1) {
            return ctx.reply(`${ctx.config.emoji.error} You need to provide a message to send.`);
        }

        ctx.msg.delete();
        return ctx.reply({ content: ctx.args.join(' '), messageReference: null });
    },
    level: 5
};
