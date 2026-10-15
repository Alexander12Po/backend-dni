const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = 33050629;
const apiHash = "ae789df99ca8b54151e009fcfefe8c45";

(async () => {
    console.log("Generando nueva sesión...");
    const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.start({
        phoneNumber: async () => await input.text("Tu número (con código de país, ej +51...): "),
        password: async () => await input.text("Contraseña 2FA (si tienes, si no, Enter): "),
        phoneCode: async () => await input.text("Código que te llegó por Telegram: "),
        onError: (err) => console.log(err),
    });
    console.log("✅ Sesión generada. Copia este string completo:");
    console.log(client.session.save());
    process.exit(0);
})();
