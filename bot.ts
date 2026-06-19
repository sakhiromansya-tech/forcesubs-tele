import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
const warnings = new Map<number, number>();

dotenv.config();

console.log("cwd =", process.cwd());

const result = dotenv.config();
console.log(result);

console.log("TOKEN:", process.env.TELEGRAM_BOT_TOKEN);

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

const currentWarn =
warnings.get(userId) || 0;

const newWarn =
currentWarn + 1;

warnings.set(
userId,
newWarn
);

// hapus pesan user
//try{
//await ctx.deleteMessage();
//}catch{}

if(newWarn >= 3){

try{

await ctx.restrictChatMember(
userId,
{
permissions:{
can_send_messages:false
},
until_date:
Math.floor(Date.now()/1000)
+ 600
}
);

await ctx.reply(
`🔇 ${ctx.from.first_name} mute  karena sudah mencapai 3 pelanggaran, silakan join terlebih dahulu.`
);

}catch(err){

console.log(err);

}

return;
}
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

`⚠️ Peringatan ${newWarn}/3

Halo [${ctx.from.first_name}](tg://user?id=${userId})

Join semua CH & LPM terlebih dulu, Jiks mencapai 3 pelanggaran, kamu akan otomatis di-mute selama 10 menit.`,

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

},10000);

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
bot.command("setup", async (ctx) => {

  if (
    ctx.chat.type !== "group" &&
    ctx.chat.type !== "supergroup"
  ) return;

  const admin = await ctx.getChatMember(
    ctx.from.id
  );

  if (
    admin.status !== "administrator" &&
    admin.status !== "creator"
  ) {
    return;
  }

  const args = ctx.message.text
    .split(" ")
    .slice(1);

  if (args.length === 0) {
    return ctx.reply(
      "Contoh:\n/setup @channel1 @channel2"
    );
  }

  const groups = JSON.parse(
    fs.readFileSync(
      "groups.json",
      "utf8"
    )
  );

  groups[String(ctx.chat.id)] = args;

  fs.writeFileSync(
    "groups.json",
    JSON.stringify(
      groups,
      null,
      2
    )
  );

  return ctx.reply(
    "✅ Channel berhasil disimpan!"
  );

});
bot.telegram.getMe()
.then(me => {
  console.log("BOT:", me.username);
})
.catch(err => {
  console.log("GETME ERROR:", err);
});
console.log("CHANNELS:", requiredChannels);

bot.launch();
bot.catch((err) => {
  console.log("BOT ERROR:", err);
});
console.log("bot berjalan...");