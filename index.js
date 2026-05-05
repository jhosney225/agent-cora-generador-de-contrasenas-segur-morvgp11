
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function calculateEntropy(password) {
  const charsets = {
    lowercase: /[a-z]/,
    uppercase: /[A-Z]/,
    numbers: /[0-9]/,
    symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  };

  let poolSize = 0;
  if (charsets.lowercase.test(password)) poolSize += 26;
  if (charsets.uppercase.test(password)) poolSize += 26;
  if (charsets.numbers.test(password)) poolSize += 10;
  if (charsets.symbols.test(password)) poolSize += 32;

  if (poolSize === 0) return 0;

  const entropy = password.length * Math.log2(poolSize);
  return entropy;
}

function getEntropyLevel(entropy) {
  if (entropy < 28) return "Muy débil";
  if (entropy < 36) return "Débil";
  if (entropy < 60) return "Moderado";
  if (entropy < 90) return "Fuerte";
  if (entropy < 128) return "Muy fuerte";
  return "Extremadamente fuerte";
}

function generatePassword(length, options) {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{};\\':\"|,.<>/?";

  let charset = "";
  if (options.lowercase) charset += lowercase;
  if (options.uppercase) charset += uppercase;
  if (options.numbers) charset += numbers;
  if (options.symbols) charset += symbols;

  if (charset === "") {
    charset = lowercase + uppercase + numbers;
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
}

async function getPasswordRecommendations(password) {
  const entropy = calculateEntropy(password);
  const level = getEntropyLevel(entropy);

  const conversationHistory = [];

  conversationHistory.push({
    role: "user",
    content: `Soy un generador de contraseñas seguras. Tengo una contraseña con los siguientes datos:
- Contraseña: ${password}
- Longitud: ${password.length}
- Entropía: ${entropy.toFixed(2)} bits
- Nivel de seguridad: ${level}

Por favor, proporciona un breve análisis de seguridad (máximo 3 líneas) y recomendaciones específicas si es necesario. Sé conciso y práctico.`,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 300,
    messages: conversationHistory,
  });

  conversationHistory.push({
    role: "assistant",
    content: response.content[0].text,
  });

  return {
    password,
    entropy: entropy.toFixed(2),
    level,
    analysis: response.content[0].text,
    conversationHistory,
  };
}

async function interactiveSession() {
  console.log(
    "\n╔════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║     GENERADOR DE CONTRASEÑAS SEGURAS CON MEDIDOR DE ENTROPÍA   ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════╝\n"
  );

  let conversationHistory = [];

  while (true) {
    console.log("\nOpciones disponibles:");
    console.log("1. Generar nueva contraseña");
    console.log("2. Analizar contraseña existente");
    console.log("3. Hacer pregunta sobre seguridad");
    console.log("4. Salir");

    const choice = await question("\nSelecciona una opción (1-4): ");

    if (choice === "4") {
      console.log("\n¡Gracias por usar el generador de contraseñas!");
      rl.close();
      break;
    }

    if (choice === "1") {
      const lengthStr = await question(
        "Longitud de la contraseña (por defecto 16): "
      );
      const length = parseInt(lengthStr) || 16;

      const useSymbols = await question("¿Incluir símbolos? (s/n, por defecto s): ");
      const useLower = true;
      const useUpper = true;
      const useNumbers = true;
      const useSymbolsFlag =
        useSymbols.toLowerCase() !== "n";

      const password = generatePassword(length, {
        lowercase: useLower,
        uppercase: useUpper,
        numbers: useNumbers,
        symbols: useSymbolsFlag,
      });

      console.log(`\n✓ Contraseña generada: ${password}`);
      console.log(`✓ Longitud: ${password.length}`);

      const entropy = calculateEntropy(password);
      const level = getEntropyLevel(entropy);
      console.log(`✓ Entropía: ${entropy.toFixed(2)} bits`);
      console.