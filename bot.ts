import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(
process.env.TELEGRAM_BOT_TOKEN!
);

const requiredChannels = (
process.env.REQUIRED_CHANNELS || ""
)
.split(",")
.filter(c => c.trim() !== "");

// cek member
async function checkMembership(userId:number){

const notJoined:string[]=[];

for(const channel of requiredChannels){

try{

const member=
await bot.telegram.getChatMember(
channel,
userId
);

const allowed=[
"member",
"administrator",
"creator",
"restricted"
];

if(
!allowed.includes(member.status)
){
notJoined.push(channel);
}

}catch{
console.log(`Gagal cek ${channel}`);
}

}

return notJoined;
}


// pesan grup
bot.on("message",async(ctx,next)=>{

const userId=ctx.from.id;
const chatId=ctx.chat.id;

const isGroup=[
"group",
"supergroup"
]
.includes(ctx.chat.type);

if(!isGroup) return next();


// admin bebas
try{

const admin=
await ctx.getChatMember(
userId
);

if(
admin.status==="administrator"||
admin.status==="creator"
){
return next();
}

}catch{}


// cek join
const notJoined=
await checkMembership(userId);


// belum join
if(notJoined.length>0){

// hapus pesan user
try{
await ctx.deleteMessage();
}catch{}


// tombol join
const buttons:any = [];

notJoined.forEach(channel=>{

buttons.push([

Markup.button.url(
`Join ${channel}`,
`https://t.me/${channel.replace("@","")}`
)

]);

});

buttons.push([

Markup.button.callback(
"✅ Sudah join",
"check_join"
)

]);
// tag user
const warning=
await ctx.reply(

`HALOO [${ctx.from.first_name}](tg://user?id=${userId})

Join semua CH & LPM dulu yaa sebelum chat di sini.`,

{
parse_mode:"Markdown",
...Markup.inlineKeyboard(
buttons
)
}

);


// hapus warning 60 detik
setTimeout(async()=>{

try{

await ctx.telegram.deleteMessage(
chatId,
warning.message_id
);

}catch{}

},60000);

return;
}

return next();

});



// tombol cek
bot.action(
"check_join",
async(ctx)=>{

try{

const userId=ctx.from.id;

const notJoined=
await checkMembership(
userId
);

if(
notJoined.length>0
){

return await ctx.answerCbQuery(
"❌ Kamu belum join semua channel & grup chat!",
{
show_alert:true
}
);

}

await ctx.answerCbQuery(
"✅ Terima kasih sudah join!"
);

try{

await ctx.editMessageText(

`SELAMAT!! [${ctx.from.first_name}](tg://user?id=${userId}) 
sekarang bisa chat lagi tanpa terhapus.`,

{
parse_mode:"Markdown"
}

);

}catch{}

}catch(err){

console.log(
"Callback expired"
);

}

});