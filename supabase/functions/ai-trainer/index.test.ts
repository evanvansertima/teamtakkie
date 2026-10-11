// ══════════════════════════════════════════════════════════════
//  TESTS — ai-trainer
//  ─────────────────────────────────────────────────────────────
//  Draaien met:
//      deno test supabase/functions/
//
//  Met een nagemaakte Claude: er gaat geen enkel verzoek naar
//  Anthropic en het kost niets.
//
//  WAAR HET HIER OM GAAT
//  1. Alleen trainers/eigenaars met Coach of Club, en de rem werkt.
//  2. Fout voorstel → precies één correctieronde, met de fouten erin.
//  3. De rem wordt altijd losgelaten en het gebruik altijd geteld, ook
//     als Claude onderweg omvalt.
//  4. Geen teamnaam, e-mail of telefoonnummer naar Anthropic.
// ══════════════════════════════════════════════════════════════

import { type AiAfhankelijkheden, behandelAiVraag, NIET_BEREIKBAAR, schoonVraag } from "./index.ts";
import type { DbClient } from "../_gedeeld/supabase.ts";
import { gelijk } from "../_gedeeld/bewering.ts";

const CLUB = "11111111-2222-3333-4444-555555555555";
const CONTEXT = {
  leeftijd: "O12-O14", niveau: "gemiddeld", spelers: 10, keepers: 1, duur: 60, ruimte: "half-b", doel: "Positiespel",
  materiaal: { pionnen: 20, ballen: 10, doelen: 2, hesjes: true },
  teamNaam: "FC Geheimstad JO13-1", spelersLijst: ["Jantje Geheim"],
};

function onderdeel(aantal: number) {
  const labels = ["A1", "A2", "A3", "A4", "V1", "V2"];
  return {
    naam: "Rondo", type: "Positiespel", doel: "Positiespel", duur: 20, intensiteit: "middel", aantalSpelers: aantal,
    veldGrootte: "15 x 15 meter", materialen: "4 pionnen, 1 bal",
    beschrijving: "A1, A2, A3 en A4 houden de bal rond tegen V1 en V2.", aandachtspunten: ["Sta breed"],
    tekening: {
      veldType: "leeg",
      stappen: [{
        elementen: labels.map((l, i) => ({ soort: l[0] === "V" ? "speler-rood" : "speler", x: 10 + i * 10, y: 50, label: l }))
          .concat([{ soort: "pion", x: 5, y: 5, label: "" }, { soort: "bal", x: 50, y: 50, label: "" }]),
        lijnen: [{ soort: "passlijn", x1: 10, y1: 50, x2: 20, y2: 50 }],
      }],
    },
  };
}
const GOED = { titel: "Rondo-training", onderdelen: [onderdeel(6)] };
const FOUT = { titel: "Rondo-training", onderdelen: [onderdeel(9)] };   // tekst 9, tekening 6

function claudeAntwoord(invoer: unknown, id = "toolu_1") {
  return {
    status: 200,
    body: { id: "msg_1", type: "message", role: "assistant", content: [{ type: "tool_use", id, name: "training", input: invoer }],
            usage: { input_tokens: 1000, output_tokens: 2000 } },
  };
}

interface Opzet {
  mag?: boolean;
  rem?: string;
  claude?: { status: number; body: unknown }[];
  sleutel?: string;
}
function opzet(o: Opzet = {}) {
  const rpc: { naam: string; argumenten: Record<string, unknown> }[] = [];
  const naarClaude: Record<string, unknown>[] = [];
  const logs: string[] = [];
  const antwoorden = (o.claude ?? [claudeAntwoord(GOED)]).slice();
  function db(): DbClient {
    return {
      gebruiker: () => Promise.resolve({ id: "gebruiker-1" }),
      selecteer: () => Promise.resolve([]),
      invoegen: () => Promise.resolve(),
      bijwerken: () => Promise.resolve(),
      rpc: (naam, argumenten) => {
        rpc.push({ naam, argumenten });
        if (naam === "mag_serverdata_schrijven") return Promise.resolve(o.mag ?? true);
        if (naam === "ai_verzoek_start") return Promise.resolve([{ uitkomst: o.rem ?? "ok", verzoek_id: o.rem && o.rem !== "ok" ? null : 42 }]);
        return Promise.resolve(null);
      },
    };
  }
  const fetchFn = ((url: string | URL | Request, init?: RequestInit) => {
    naarClaude.push({ url: String(url), headers: init?.headers, body: JSON.parse(String(init?.body)) });
    const a = antwoorden.shift() ?? { status: 500, body: { error: "geen antwoord meer" } };
    return Promise.resolve(new Response(JSON.stringify(a.body), { status: a.status }));
  }) as typeof fetch;
  const deps: AiAfhankelijkheden = {
    gebruikerClient: db, serviceClient: db,
    anthropicSleutel: () => o.sleutel ?? "sk-ant-test",
    model: () => "claude-sonnet-5-5",
    fetchFn,
    log: (b, v) => logs.push(b + " " + JSON.stringify(v ?? {})),
  };
  return { deps, rpc, naarClaude, logs };
}
function verzoek(body: Record<string, unknown>, metToken = true): Request {
  return new Request("https://x/functions/v1/ai-trainer", {
    method: "POST",
    headers: metToken ? { Authorization: "Bearer jwt-van-trainer" } : {},
    body: JSON.stringify(body),
  });
}
const VRAAG = { club_id: CLUB, context: CONTEXT, vraag: "Maak een training positiespel" };

Deno.test("zonder inlog: 401, niets naar Claude", async () => {
  const o = opzet();
  const r = await behandelAiVraag(verzoek(VRAAG, false), o.deps);
  gelijk([r.status, o.naarClaude.length], [401, 0]);
});

Deno.test("geen Coach/Club of geen trainer: 403, niets naar Claude, rem niet aangeraakt", async () => {
  const o = opzet({ mag: false });
  const r = await behandelAiVraag(verzoek(VRAAG), o.deps);
  gelijk([r.status, o.naarClaude.length, o.rpc.map((x) => x.naam)], [403, 0, ["mag_serverdata_schrijven"]]);
});

Deno.test("de recht-vraag gaat met het token van de gebruiker, voor de juiste club", async () => {
  const o = opzet();
  await behandelAiVraag(verzoek(VRAAG), o.deps);
  gelijk(o.rpc[0], { naam: "mag_serverdata_schrijven", argumenten: { doel: CLUB } });
});

Deno.test("rem: vorige vraag nog bezig → 429, niets naar Claude", async () => {
  const o = opzet({ rem: "bezig" });
  const r = await behandelAiVraag(verzoek(VRAAG), o.deps);
  gelijk([r.status, o.naarClaude.length], [429, 0]);
});
Deno.test("rem: te veel vragen → 429", async () => {
  const o = opzet({ rem: "te-veel" });
  gelijk((await behandelAiVraag(verzoek(VRAAG), o.deps)).status, 429);
});

Deno.test("geldig voorstel: één vraag aan Claude, geen meldingen, gebruik geteld", async () => {
  const o = opzet();
  const r = await behandelAiVraag(verzoek(VRAAG), o.deps);
  const b = await r.json();
  gelijk([r.status, b.fouten, b.gecorrigeerd, b.training.titel, o.naarClaude.length], [200, [], false, "Rondo-training", 1]);
  gelijk(o.rpc[o.rpc.length - 1], { naam: "ai_verzoek_klaar", argumenten: { p_id: 42, p_tokens_in: 1000, p_tokens_uit: 2000 } });
});

Deno.test("Claude moet de tool gebruiken, met het vaste schema", async () => {
  const o = opzet();
  await behandelAiVraag(verzoek(VRAAG), o.deps);
  const body = o.naarClaude[0].body as Record<string, unknown>;
  const tools = body.tools as Record<string, unknown>[];
  gelijk([body.tool_choice, tools[0].name, (tools[0].input_schema as Record<string, unknown>).required], [
    { type: "tool", name: "training" }, "training", ["titel", "onderdelen"],
  ]);
  gelijk([body.model, typeof body.max_tokens], ["claude-sonnet-5-5", "number"]);
});

Deno.test("fout voorstel: precies één correctie, met de fouten erin", async () => {
  const o = opzet({ claude: [claudeAntwoord(FOUT, "toolu_a"), claudeAntwoord(GOED, "toolu_b")] });
  const r = await behandelAiVraag(verzoek(VRAAG), o.deps);
  const b = await r.json();
  gelijk([r.status, b.fouten, b.gecorrigeerd, o.naarClaude.length], [200, [], true, 2]);
  const tweede = (o.naarClaude[1].body as Record<string, unknown>).messages as Record<string, unknown>[];
  const terug = (tweede[2].content as Record<string, unknown>[])[0];
  gelijk([tweede.length, terug.type, terug.tool_use_id, terug.is_error], [3, "tool_result", "toolu_a", true]);
  gelijk(/9 spelers, maar de tekening heeft er 6/.test(String(terug.content)), true);
  gelijk(o.rpc[o.rpc.length - 1].argumenten, { p_id: 42, p_tokens_in: 2000, p_tokens_uit: 4000 });
});

Deno.test("na de correctie nog steeds fout: geen derde ronde, meldingen gaan mee naar de trainer", async () => {
  const o = opzet({ claude: [claudeAntwoord(FOUT), claudeAntwoord(FOUT), claudeAntwoord(GOED)] });
  const b = await (await behandelAiVraag(verzoek(VRAAG), o.deps)).json();
  gelijk([o.naarClaude.length, b.fouten.length > 0, b.gecorrigeerd], [2, true, true]);
});

Deno.test("Claude valt om: nette melding, rem toch losgelaten", async () => {
  const o = opzet({ claude: [{ status: 529, body: { type: "error" } }] });
  const r = await behandelAiVraag(verzoek(VRAAG), o.deps);
  gelijk([r.status, (await r.json()).fout], [502, NIET_BEREIKBAAR]);
  gelijk(o.rpc[o.rpc.length - 1].naam, "ai_verzoek_klaar");
});

Deno.test("geen sleutel ingesteld: 503, rem niet aangeraakt", async () => {
  const o = opzet({ sleutel: "" });
  const r = await behandelAiVraag(verzoek(VRAAG), o.deps);
  gelijk([r.status, o.rpc.length], [503, 0]);
});

Deno.test("privacy: geen teamnaam, spelersnaam, e-mail of telefoon naar Anthropic", async () => {
  const o = opzet();
  await behandelAiVraag(verzoek({ ...VRAAG, vraag: "Training voor ons, mail me op trainer@club.nl of bel 06-12345678" }), o.deps);
  const alles = JSON.stringify(o.naarClaude);
  gelijk([/Geheimstad|Jantje|trainer@club\.nl|12345678/.test(alles), /e-mail weggelaten/.test(alles), /telefoon weggelaten/.test(alles)], [false, true, true]);
});

Deno.test("logboek zonder inhoud: geen vraag, geen training", async () => {
  const o = opzet();
  await behandelAiVraag(verzoek({ ...VRAAG, vraag: "Rondo voor de zondagsgroep" }), o.deps);
  gelijk(/zondagsgroep|Rondo/.test(o.logs.join("\n")), false);
});

Deno.test("makkelijker/moeilijker/vervangen: huidige training en opdracht gaan mee", async () => {
  const o = opzet();
  await behandelAiVraag(verzoek({ club_id: CLUB, context: CONTEXT, basis: GOED, actie: "makkelijker", onderdeel: 1, vraag: "" }), o.deps);
  const tekst = String(((o.naarClaude[0].body as Record<string, unknown>).messages as Record<string, unknown>[])[0].content);
  gelijk([/De huidige training/.test(tekst), /Maak onderdeel 1 makkelijker/.test(tekst)], [true, true]);
});

Deno.test("schoonVraag: lange vragen worden ingekort", () => {
  gelijk(schoonVraag("x".repeat(5000)).length, 1500);
});
