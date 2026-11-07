/* ══════════════════════════════════════════════════════════════
   Tests voor "Wachtwoord vergeten?" (src/kern/server.js)
   Draaien:  node tests/wachtwoord-herstel.test.js
   Aanleiding, 7 november 2026: testers konden hun wachtwoord niet
   herstellen — de functie bestond niet. Deze test knipt de echte
   functies uit server.js en draait ze met een nagebootste browser
   en server.
   ══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const bron = fs.readFileSync(process.env.TT_SERVER || path.join(__dirname, "..", "src", "kern", "server.js"), "utf8");
function knip(naam) {
  const start = bron.indexOf("function " + naam + "(");
  if (start < 0) throw new Error(naam + " niet gevonden in src/kern/server.js");
  const eind = bron.indexOf("\n}\n", start);
  return bron.slice(start, eind + 2);
}
function knipConst(naam) {
  const start = bron.indexOf("const " + naam + " = ");
  return bron.slice(start, bron.indexOf("\n];", start) + 3).replace(/^const /, "var ");
}

/* De nagebootste wereld */
let verzoeken = [], antwoorden = {}, sessie = null, gewisseld = 0, adres = "";
global.window = { location: { origin: "https://app.teamtakkie.nl", pathname: "/", search: "", get hash() { return adres; } },
                  history: { replaceState: function () { adres = ""; } } };
global.URLSearchParams = URLSearchParams;
function serverAan() { return true; }
function serverFout(soort, tekst) { return { ok: false, fout: { soort, tekst } }; }
function verbindingsFout() { return serverFout("verbinding", "Geen verbinding."); }
function serverBoodschap(r) { return vertaalServer((r.gegevens && (r.gegevens.msg || r.gegevens.error_description)) || ""); }
function _haalOp(pad, opties) {
  verzoeken.push({ pad, methode: (opties && opties.methode) || "GET", lichaam: opties && opties.lichaam, token: opties && opties.token });
  const a = antwoorden[pad.split("?")[0]] || { status: 200, ok: true, gegevens: {} };
  return Promise.resolve(a);
}
function serverVraag(pad, opties) {
  return _haalOp(pad, Object.assign({}, opties, { token: sessie && sessie.token }))
    .then((r) => r.ok ? { ok: true, gegevens: r.gegevens } : serverFout("server", serverBoodschap(r)));
}
function sessieUit(g) { return g && g.access_token && g.user ? { token: g.access_token, verversToken: g.refresh_token, gebruiker: g.user } : null; }
function wisselAccount() { gewisseld++; return false; }
function zetSessie(s) { sessie = s; }

eval([knipConst("SERVER_TAAL"), knip("vertaalServer"), knip("_terugNaBevestiging"), knip("serverWachtwoordVergeten"),
      knip("herstelLinkInAdres"), knip("serverNieuwWachtwoord"), knip("serverBevestigingUitLink")].join("\n"));

let goed = 0, fout = 0;
const ok = (naam, echt, verwacht) => {
  const gelijk = JSON.stringify(echt) === JSON.stringify(verwacht);
  gelijk ? goed++ : fout++;
  console.log(`  ${gelijk ? "ok  " : "FOUT"} ${naam}` + (gelijk ? "" : `\n        kreeg    ${JSON.stringify(echt)}\n        verwacht ${JSON.stringify(verwacht)}`));
};

(async () => {
  console.log("\nde herstelmail aanvragen");
  let r = await serverWachtwoordVergeten("  test@voorbeeld.nl ");
  ok("lukt", r.ok, true);
  ok("naar /recover, terug naar de app", [verzoeken[0].pad, verzoeken[0].methode],
     ["/auth/v1/recover?redirect_to=https%3A%2F%2Fapp.teamtakkie.nl%2F", "POST"]);
  ok("met het e-mailadres zonder spaties", verzoeken[0].lichaam, { email: "test@voorbeeld.nl" });
  antwoorden["/auth/v1/recover"] = { status: 429, ok: false, gegevens: { msg: "email rate limit exceeded" } };
  r = await serverWachtwoordVergeten("a@b.nl");
  ok("te vaak: nette melding", r.fout.tekst, "Er zijn te veel mails verstuurd. Probeer het over een kwartier nog eens.");

  console.log("\nterug via de link");
  adres = "";
  ok("geen link: niets", herstelLinkInAdres(), false);
  adres = "#access_token=t1&refresh_token=r1&expires_in=3600&type=signup";
  ok("bevestigingslink is geen herstellink", herstelLinkInAdres(), false);
  adres = "#access_token=t1&refresh_token=r1&expires_in=3600&type=recovery";
  ok("herstellink herkend", herstelLinkInAdres(), true);
  antwoorden["/auth/v1/user"] = { status: 200, ok: true, gegevens: { id: "u1", email: "test@voorbeeld.nl" } };
  verzoeken = [];
  const u = await serverBevestigingUitLink();
  ok("logt in en vraagt om een nieuw wachtwoord", u.soort, "herstel");
  ok("met het token uit de link", [verzoeken[0].pad, verzoeken[0].token, sessie && sessie.token], ["/auth/v1/user", "t1", "t1"]);
  ok("adresbalk is schoongemaakt (geen token in de geschiedenis)", adres, "");
  ok("accountwissel-controle gedaan", gewisseld, 1);
  adres = "#access_token=t2&refresh_token=r2&expires_in=3600&type=signup";
  ok("bevestigingslink blijft gewoon inloggen", (await serverBevestigingUitLink()).soort, "ingelogd");
  adres = "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
  ok("verlopen link: uitleg", /verlopen/.test((await serverBevestigingUitLink()).tekst), true);

  console.log("\nhet nieuwe wachtwoord");
  sessie = { token: "t1" }; verzoeken = [];
  antwoorden["/auth/v1/user"] = { status: 200, ok: true, gegevens: { id: "u1" } };
  r = await serverNieuwWachtwoord("Nieuw!Wachtw00rd");
  ok("PUT naar /user met het wachtwoord en de sessie", [r.ok, verzoeken[0].methode, verzoeken[0].lichaam, verzoeken[0].token],
     [true, "PUT", { password: "Nieuw!Wachtw00rd" }, "t1"]);
  antwoorden["/auth/v1/user"] = { status: 422, ok: false, gegevens: { msg: "New password should be different from the old password." } };
  r = await serverNieuwWachtwoord("Oud!Wachtw00rd");
  ok("zelfde als het oude: nette melding", r.fout.tekst, "Je nieuwe wachtwoord moet anders zijn dan je oude.");

  console.log(`\n${goed} geslaagd, ${fout} gefaald`);
  process.exit(fout ? 1 : 0);
})();
