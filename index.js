require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");
const csv = require("csv-parser");
const pool = require("./db");

const bot = new Telegraf(process.env.BOT_TOKEN);

const isAdmin = (id) =>
  process.env.ADMINS.split(",").includes(String(id));

bot.start((ctx) => {
  ctx.reply("HR File Bot Pro 🚀");
});


// SEARCH
bot.command("search", async (ctx) => {
  const key = ctx.message.text.split(" ")[1];

  const result = await pool.query(
    "SELECT * FROM users WHERE name ILIKE $1 OR user_code = $1",
    [`%${key}%`]
  );

  ctx.reply(JSON.stringify(result.rows, null, 2));
});


// LIST
bot.command("list", async (ctx) => {
  const result = await pool.query("SELECT * FROM users LIMIT 20");
  ctx.reply(JSON.stringify(result.rows, null, 2));
});


// FILE UPLOAD HANDLER
bot.on("document", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const file = await ctx.telegram.getFile(ctx.message.document.file_id);
  const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

  const res = await fetch(url);
  const buffer = await res.buffer();

  fs.writeFileSync("data.csv", buffer);

  fs.createReadStream("data.csv")
    .pipe(csv())
    .on("data", async (row) => {
      await pool.query(
        "INSERT INTO users(name, user_code, role, phone) VALUES($1,$2,$3,$4) ON CONFLICT (user_code) DO NOTHING",
        [row.name, row.user_code, row.role, row.phone]
      );
    })
    .on("end", () => {
      ctx.reply("File imported successfully ✅");
    });
});

bot.launch();
console.log("Bot running...");