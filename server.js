require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");

const app = express();
app.use(cors());
app.use(express.json());

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION_STRING);
const botUsername = process.env.BOT_USERNAME;

let client;
let clienteListo = false;
const pendientes = new Map();

async function iniciarCliente() {
  client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  clienteListo = true;
  console.log("Cliente de Telegram conectado.");

  client.addEventHandler(async (event) => {
    const message = event.message;
    const senderUsername = (await message.getSender())?.username;

    if (senderUsername === botUsername) {
      const pendiente = [...pendientes.keys()][0];
      if (pendiente) {
        const resolve = pendientes.get(pendiente);
        pendientes.delete(pendiente);

        let imagenBase64 = null;
        if (message.photo) {
          const buffer = await client.downloadMedia(message, {});
          imagenBase64 = buffer.toString("base64");
        }

        resolve({
          texto: message.text || "",
          imagen: imagenBase64,
        });
      }
    }
  }, new NewMessage({}));
}

app.get("/estado", (req, res) => {
  res.json({ listo: clienteListo });
});

app.post("/consulta-dni", async (req, res) => {
  const { dni } = req.body;
  if (!dni) return res.status(400).json({ error: "Falta el DNI" });

  try {
    const resultadoPromise = new Promise((resolve) => {
      pendientes.set(dni, resolve);
      setTimeout(() => {
        if (pendientes.has(dni)) {
          pendientes.delete(dni);
          resolve(null);
        }
      }, 15000);
    });

    await client.sendMessage(botUsername, { message: "/dni " + dni });
    const resultado = await resultadoPromise;

    if (!resultado) {
      return res.status(504).json({ error: "El bot no respondio a tiempo" });
    }

    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

app.post("/consulta-nombre", async (req, res) => {
  const { nombres, paterno, materno } = req.body;

  const nombresFormato = nombres.trim().replace(/\s+/g, ",");
  let comando = "/nm " + nombresFormato + "|" + paterno.trim();
  if (materno && materno.trim()) {
    comando += "|" + materno.trim();
  }

  try {
    const resultadoPromise = new Promise((resolve) => {
      pendientes.set(comando, resolve);
      setTimeout(() => {
        if (pendientes.has(comando)) {
          pendientes.delete(comando);
          resolve(null);
        }
      }, 15000);
    });

    await client.sendMessage(botUsername, { message: comando });
    const resultado = await resultadoPromise;

      return res.status(504).json({ error: "El bot no respondio a tiempo" });
    }

    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto " + PORT));
iniciarCliente();
