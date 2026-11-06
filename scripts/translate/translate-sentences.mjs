// Machine-translates Indonesian sentences into English for the sentence pool
// (see scripts/build-sentence-pool.ts), on the CPU, with Opus-MT: the
// Helsinki-NLP opus-mt-id-en model (Apache-2.0), in its ONNX conversion
// Xenova/opus-mt-id-en, run by transformers.js.
//
//   cd scripts/translate && npm install
//   node translate-sentences.mjs <todo.txt> <mt.tsv> [--jobs 4] [--models <dir>]
//
// todo.txt has one sentence per line. Each translation is appended to mt.tsv
// as "<Indonesian>\t<English>" as soon as it is done, and sentences already in
// mt.tsv are skipped, so a run can be stopped and picked up again. Expect
// 3–5 sentences a second per job. The model is downloaded from the Hugging
// Face hub the first time, or read from --models <dir>/Xenova/opus-mt-id-en.
// Sentences are translated one at a time: batching them gave garbled endings.

import { fork } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MODEL = "Xenova/opus-mt-id-en";
const CHUNK = 20;

if (process.env.TRANSLATE_WORKER) {
  const { env, pipeline } = await import("@huggingface/transformers");
  if (process.env.TRANSLATE_MODELS) {
    env.localModelPath = process.env.TRANSLATE_MODELS;
    env.allowRemoteModels = false;
  }
  const translate = await pipeline("translation", MODEL, {
    dtype: "fp32",
    // One thread per job: several single-threaded jobs get more done.
    session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
  });
  process.on("message", async (texts) => {
    if (texts === "stop") process.exit(0);
    const out = [];
    for (const text of texts) {
      const [result] = await translate(text, { max_new_tokens: 128 });
      out.push(result.translation_text.replace(/\s+/g, " ").trim());
    }
    process.send(out);
  });
  process.send("ready");
} else {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const at = args.indexOf(name);
    return at < 0 ? fallback : args.splice(at, 2)[1];
  };
  const jobs = Number(option("--jobs", 4));
  const models = option("--models");
  const [todoPath, outPath] = args;
  if (!todoPath || !outPath) {
    console.error(
      "Usage: node translate-sentences.mjs <todo.txt> <mt.tsv> [--jobs 4] [--models <dir>]"
    );
    process.exit(1);
  }

  const done = new Set();
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, "utf8").split("\n")) {
      if (line) done.add(line.split("\t")[0]);
    }
  }
  const todo = [
    ...new Set(readFileSync(todoPath, "utf8").split("\n").filter(Boolean)),
  ].filter((text) => !done.has(text) && !text.includes("\t"));
  console.log(`${todo.length} to translate (${done.size} already done)`);

  let next = 0;
  let finished = 0;
  const started = Date.now();
  const report = () => {
    const perSecond = finished / ((Date.now() - started) / 1000);
    const hoursLeft = (todo.length - finished) / perSecond / 3600;
    console.log(
      `${finished} / ${todo.length}, ${perSecond.toFixed(1)} a second, about ${hoursLeft.toFixed(1)} h left`
    );
  };

  const workers = Array.from({ length: Math.min(jobs, todo.length) }, () => {
    const worker = fork(fileURLToPath(import.meta.url), {
      env: {
        ...process.env,
        TRANSLATE_WORKER: "1",
        ...(models ? { TRANSLATE_MODELS: models } : {}),
      },
    });
    let chunk = [];
    const give = () => {
      chunk = todo.slice(next, next + CHUNK);
      next += chunk.length;
      worker.send(chunk.length ? chunk : "stop");
    };
    worker.on("message", (message) => {
      if (message !== "ready") {
        appendFileSync(
          outPath,
          chunk.map((text, i) => `${text}\t${message[i]}\n`).join("")
        );
        const before = finished;
        finished += chunk.length;
        if (Math.floor(finished / 1000) > Math.floor(before / 1000)) report();
      }
      give();
    });
    return new Promise((resolve, reject) => {
      worker.on("exit", (code) =>
        code
          ? reject(new Error(`A job stopped (exit code ${code})`))
          : resolve()
      );
    });
  });
  await Promise.all(workers);
  if (todo.length) report();
}
