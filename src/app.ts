import { join } from "path";
import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  utils,
  EVENTS,
} from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

import { runCompletion } from "./ai.js";
import { assistantOpenai } from "./assistantOpenai.js";
// import { appendToSheet, readSheet } from "./utils.js";

const PORT = process.env.PORT ?? 3008;

const welcomeFlow = addKeyword<Provider, Database>("VioAi")
  .addAnswer(`🙌 Hello welcome to this *Vio AI Chatbot*`, {
    media: "./foto.png",
  })
  .addAction(async (ctx, { flowDynamic }) => {
    await flowDynamic([
      `How are you ${ctx.name}?`,
      "Si quieres hablar con la AI escribe *Ai*",
      "si quieres ver el pilastras escribe *pilastra*",
    ]);
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, gotoFlow }) => {
    if (ctx.body.toLocaleLowerCase().includes("ai")) {
      await flowDynamic("Seleccionaste *AI*");
      return gotoFlow(aiFlow);
    } else if (ctx.body.toLocaleLowerCase().includes("pilastra")) {
      await flowDynamic("Seleccionaste *pilastra*");
      return gotoFlow(menuFlow);
    }
    return await flowDynamic("No es la respuesta esperada");
  });

const menuFlow = addKeyword(EVENTS.ACTION)
  .addAnswer([
    "Hola estas son las Pilastras",
    "Puedes elegir: ",
    "1: Monofasica",
    "2: Monofasica doble",
    "3: Trifasica",
  ])
  .addAction({ capture: true }, async (ctx, { flowDynamic, fallBack }) => {
    if (!["1", "2", "3"].includes(ctx.body)) {
      return fallBack("Opcion Incorrecta, por favor eliga una");
    }
    switch (ctx.body) {
      case "1":
        return await flowDynamic([
          {
            body: "Seleccionaste Monofasica, precio:2000, podes consultar: wwww.verlink.com",
            media:
              "https://www.compraensanjuan.com/fotos_servicios/1280229_1.jpg",
          },
        ]);
      case "2":
        return await flowDynamic([
          {
            body: "Seleccionaste Monofasica doble, precio:20000, podes consultar: wwww.verlink.com",
            media:
              "https://www.compraensanjuan.com/fotos_servicios/1280229_1.jpg",
          },
        ]);
      case "3":
        return await flowDynamic([
          {
            body: "Seleccionaste Trifasica, precio:20000, podes consultar: wwww.verlink.com",
            media:
              "https://www.compraensanjuan.com/fotos_servicios/1280229_1.jpg",
          },
        ]);
    }
  });

const aiFlow = addKeyword(EVENTS.ACTION).addAnswer(
  "Haz tu consulta: ",
  { capture: true },
  async (cnx, { flowDynamic }) => {
    const prompt =
      "Tu eres un asistente que vende autos usado y no sabes hacer nada mas, solo responde a eso";
    const consulta = cnx.body;
    const answer = await runCompletion(prompt, consulta);
    return await flowDynamic(answer);
  }
);

// const gastos = addKeyword("GastosBot")
//   .addAnswer("Hola, Bienvenido a gastos")
//   .addAnswer("Nombre de tu gasto?")
//   .addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
//     await state.update({ name: ctx.body });
//     const name = await state.get("name");
//     await flowDynamic(`El nombre de tu gasto es: ${name}`);
//   })
//   .addAnswer("Monto de tu gasto?")
//   .addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
//     await state.update({ amount: ctx.body });
//     const amount = await state.get("amount");
//     await flowDynamic(`Monto: ${amount}`);
//   })
//   .addAnswer("Categoria de tu gasto?")
//   .addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
//     await state.update({ category: ctx.body });
//     const category = await state.get("category");
//     await flowDynamic(`Categoría: ${category}`);
//   })
//   .addAction(null, async (_, { state, flowDynamic }) => {
//     await flowDynamic("Gracias, tus datos fueron registrados");
//     const name = await state.get("name");
//     const amount = await state.get("amount");
//     const category = await state.get("category");
//     await appendToSheet([[name, amount, category]]);
//   });

// const gastosHistory = addKeyword("GastosHistory")
//   .addAnswer("Dime que quieres saber de tus gastos?")
//   .addAction({ capture: true }, async (ctx, { flowDynamic }) => {
//     const gastos = await readSheet("Sheet1!A1:C10");
//     const prompt =
//       "Tu eres un asistente financiero que tienes mis datos y no respondes nada que no este en el contexto, te voy a hacer preguntas sobre eso";
//     const consulta = ctx.body + "\nMis gastos son" + gastos;
//     const answer = await runCompletion(prompt, consulta);
//     await flowDynamic(answer);
//   });

const assistant = addKeyword("Assistant")
  .addAnswer([
    "Bienvenido a VioAI Restaurant",
    "Puedes preguntar cualquiero cosa sobre el menu?",
    "Ej: Que opciones con veganas tienes?",
  ])
  .addAction({ capture: true }, async (ctx, { flowDynamic }) => {
    const mensaje = ctx.body;
    const answer = await assistantOpenai(mensaje);
    console.log(answer);
    await flowDynamic(answer);
  });

const main = async () => {
  const adapterFlow = createFlow([
    welcomeFlow,
    menuFlow,
    aiFlow,
    // gastos,
    // gastosHistory,
    assistant,
  ]);

  const adapterProvider = createProvider(Provider);
  const adapterDB = new Database();

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  adapterProvider.server.post(
    "/v1/messages",
    handleCtx(async (bot, req, res) => {
      const { number, message, urlMedia } = req.body;
      await bot.sendMessage(number, message, { media: urlMedia ?? null });
      return res.end("sended");
    })
  );

  adapterProvider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );

  httpServer(+PORT);
};

main();
