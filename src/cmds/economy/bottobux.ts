import { CommandContext } from '../../types';

export default {
    name: 'bottobux',
    description: 'Tells you information about the Bottobux system.',
    usage: null,

    async exec(ctx: CommandContext) {
        const bottobux = ctx.config.emoji.bottobux;

        return ctx.reply(`${bottobux} **BOTTOBUX** ${bottobux}

The grandest, bestest economy on Discord.  Definitely. No issues at all.
*All commands must be run in <#885941525291364353>, or BOTTO will ignore you.*

__How do I sign up?__
Run \`;createwallet\`. You will be given 100 ${bottobux} to start off with.

__How do I earn?__
\`;work\` for it! Maybe you want to do some \`;hardwork\` instead? Or are you a useless member of society who likes to drink from \`;faucet\`s? Or gamble (check out \`;help\` to see the gambling commands, they're under Gambling)!

__What is it used for?__
¯\\\_(ツ)\_/¯

__Can I buy stuff?__
Yes! Check out \`;zantetsumart\`! You can buy items from it with \`;buy\`.`);
    },
    level: 0
};
