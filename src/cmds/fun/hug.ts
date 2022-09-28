import axios from 'axios';
import { CommandContext } from '../../types';
import { discordSnowflakeRegex } from '../../utils/general';

const apiUrl = 'https://anime-api.hisoka17.repl.co/img/hug';

const bottoTargetMessage = [
    'Wait, me?',
    '...',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    '<:cri:860536275026575391>',
    '<a:wellthen:860793715643908107>',
    '<:tofublush:860387757515735100>',
    '<:zboys4:881716890681094214>'
];
const selfTargetMessage = ["It's good to hug yourself sometimes!"];

async function exec(ctx: CommandContext) {
    let snowflake = ctx.args[0];
    if (!snowflake) {
        snowflake = ctx.msg.author.id;
    }

    const userIdRaw = snowflake.match(discordSnowflakeRegex);
    if (!userIdRaw) {
        return ctx.reply(ctx.config.emoji.error + ' You need to mention a user or provide a snowflake.');
    }

    const userId = userIdRaw[1];
    const member = ctx.msg.channel.guild.members.find(m => m.id === userId);
    if (!member) {
        return ctx.reply(ctx.config.emoji.error + ' Could not find user.');
    }

    const image = await axios.get(apiUrl).then(res => res.data.url);

    if (member.id === ctx.msg.author.id) {
        return ctx.reply({
            embed: {
                description: `${ctx.msg.author.mention} hugged themselves! ${
                    selfTargetMessage[Math.floor(Math.random() * selfTargetMessage.length)]
                }`,
                image: {
                    url: image
                }
            }
        });
    }

    if (member.id === ctx.bot.user.id) {
        return ctx.reply({
            embed: {
                description: `${ctx.msg.author.mention} hugged me! ${
                    bottoTargetMessage[Math.floor(Math.random() * bottoTargetMessage.length)]
                }`,
                image: {
                    url: image
                }
            }
        });
    }

    return ctx.reply({
        embed: {
            description: `${ctx.msg.author.mention} hugged ${member.mention}!`,
            image: {
                url: image
            }
        }
    });
}

export default {
    name: 'hug',
    description: 'Hug a user!',
    args: '<user(1)?>',

    exec,
    level: 0
};
