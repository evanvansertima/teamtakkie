# -*- coding: utf-8 -*-
"""Controleert src/app.jsx voor het wordt opgeleverd:
   1. balans van accolades, haakjes en blokhaken
   2. JSX-nesting (met JS/JSX-contextwissel, zodat apostrofs in tekst geen vals alarm geven)
   3. strings die niet op dezelfde regel worden gesloten
   4. dubbele const/let/function binnen hetzelfde blok

Draai met:  python3 tools/check.py
Of op een ander bestand:  python3 tools/check.py pad/naar/bestand.html

Sinds P2 (docs/professionaliseringsplan.md) draaien dezelfde vier
controles ook automatisch over elk bestand in src/kern/ -- zodra die
map bestaat, geen aparte aanroep nodig.

WAAROM DIT BESTAND HIER STAAT EN NIET MEER IN legacy/
Tot 11 september 2026 wees hij naar legacy/fc-harlingen-app.html -- het oude
prototype van 922 KB, niet naar de app die wordt uitgerold. Wie hem draaide
kreeg te horen dat alles in orde was, over een bestand dat niemand meer
uitrolt. Dat is erger dan geen controle: het is een groen vinkje dat niets
dekt. De audit van 10 september noemde dit met zoveel woorden.

WAAROM HIJ NU NAAR src/app.jsx WIJST EN NIET MEER NAAR online/index.html
Sinds de bouwstap (P1) is src/app.jsx de JSX die mensen schrijven en is
online/index.html wat esbuild daarvan maakt. Dit script controleert of een
mens een haakje is vergeten of een string niet heeft gesloten -- een vraag
over geschreven code. In het gebouwde bestand staat die JSX er niet eens
meer in: die is vertaald naar React.createElement, dus er valt geen JSX
meer te controleren. Een JSX-controle op het gebouwde bestand zou altijd
groen zijn om de verkeerde reden, en dat is exact de fout die hierboven
staat beschreven -- alleen dan opnieuw.

Of de bouwstap zelf iets kapotmaakt, is een andere vraag. Die beantwoordt
tools/gouden-origineel.js, dat het gebouwde bestand in een echte browser
draait."""
import re, sys, os
HIER = os.path.dirname(os.path.abspath(__file__))
BESTAND = (sys.argv[1] if len(sys.argv) > 1
           else os.path.join(os.path.dirname(HIER), "src", "app.jsx"))
if not os.path.exists(BESTAND):
    print("Bestand niet gevonden: " + BESTAND); raise SystemExit(2)
VOID = {'br','img','input','hr','meta','link','area','base','col','embed','source','track','wbr'}

def jsxControle(code):
    n=len(code); fouten=[]
    def regel(p): return code.count('\n',0,p)+1
    def string(i):
        q=code[i]; st=i; i+=1
        while i<n:
            if code[i]=='\\': i+=2; continue
            if code[i]==q: return i+1
            if code[i]=='\n' and q!='`':
                fouten.append("regel %d: string met %s niet gesloten op dezelfde regel  ->  %s"
                              % (regel(st), q, code[st:i].strip()[:90]))
                return i
            if q=='`' and code[i]=='$' and i+1<n and code[i+1]=='{': i=js(i+1,True); continue
            i+=1
        fouten.append("regel %d: string met %s loopt door tot het einde"%(regel(st),q)); return i
    def js(i,ex):
        d=0
        if ex: d=1; i+=1
        while i<n:
            c=code[i]
            if c in '\'"`': i=string(i); continue
            if c=='/' and i+1<n and code[i+1]=='/':
                j=code.find('\n',i); i=n if j<0 else j; continue
            if c=='/' and i+1<n and code[i+1]=='*':
                j=code.find('*/',i); i=n if j<0 else j+2; continue
            if c=='{': d+=1; i+=1; continue
            if c=='}':
                d-=1; i+=1
                if ex and d==0: return i
                continue
            if c=='<':
                if code[i:i+2]=='<>': i=element(i); continue
                if re.match(r'<[A-Za-z]',code[i:]):
                    k=i-1
                    while k>=0 and code[k] in ' \t\n\r': k-=1
                    if not (k>=0 and (code[k].isalnum() or code[k] in '_$)].')):
                        i=element(i); continue
                i+=1; continue
            i+=1
        return i
    def element(i):
        st=i
        if code[i:i+2]=='<>': return kinderen(i+2,'',st)
        m=re.match(r'<([A-Za-z][\w.\-]*)',code[i:])
        if not m: return i+1
        tag=m.group(1); j=i+m.end(); zelf=False
        while j<n:
            d=code[j]
            if d in '\'"': j=string(j); continue
            if d=='{': j=js(j,True); continue
            if d=='>': zelf=code[j-1]=='/'; j+=1; break
            j+=1
        if zelf or tag.lower() in VOID: return j
        return kinderen(j,tag,st)
    def kinderen(i,tag,st):
        while i<n:
            c=code[i]
            if c=='{': i=js(i,True); continue
            if c=='<':
                if code[i:i+2]=='</':
                    m=re.match(r'</\s*([A-Za-z][\w.\-]*)?\s*>',code[i:])
                    if m:
                        g=m.group(1) or ''
                        if g!=tag: fouten.append("regel %d: </%s> maar <%s> stond open (regel %d)"%(regel(i),g or '>',tag or '>',regel(st)))
                        return i+m.end()
                    i+=2; continue
                i=element(i); continue
            i+=1
        fouten.append("regel %d: <%s> nooit gesloten"%(regel(st),tag or '>')); return n
    js(0,False); return fouten

def dubbeleControle(code, begin):
    schoon=[]; i=0; n=len(code)
    while i<n:
        c=code[i]
        if c in "\"'`":
            q=c; i+=1
            while i<n:
                if code[i]=='\\': i+=2; continue
                if code[i]==q: i+=1; break
                if code[i]=='\n': schoon.append('\n')
                i+=1
            schoon.append('""'); continue
        if c=='/' and i+1<n and code[i+1]=='/':
            j=code.find('\n',i); i=n if j<0 else j; continue
        if c=='/' and i+1<n and code[i+1]=='*':
            j=code.find('*/',i); stuk=code[i:(n if j<0 else j+2)]
            schoon.append('\n'*stuk.count('\n')); i=n if j<0 else j+2; continue
        schoon.append(c); i+=1
    code="".join(schoon)
    stapel=[{}]; fouten=[]; regel=1; i=0; n=len(code)
    patroon=re.compile(r'\b(const|let|function)\s+([A-Za-z_$][\w$]*)')
    while i<n:
        c=code[i]
        if c=='\n': regel+=1; i+=1; continue
        if c=='{': stapel.append({}); i+=1; continue
        if c=='}':
            if len(stapel)>1: stapel.pop()
            i+=1; continue
        mk=re.match(r'\b(for|catch|if|while|switch)\s*\(', code[i:])
        if mk:
            j=i+mk.end()-1; d=0
            while j<n:
                if code[j]=='(': d+=1
                elif code[j]==')':
                    d-=1
                    if d==0: j+=1; break
                elif code[j]=='\n': regel+=1
                j+=1
            i=j; continue
        m2=patroon.match(code,i)
        if m2:
            soort,naam=m2.group(1),m2.group(2)
            if code[max(0,i-1):i] not in ".":
                huidig=stapel[-1]
                if naam in huidig:
                    fouten.append("regel %d: %s %s stond al op regel %d"%(begin+regel-1,soort,naam,huidig[naam]))
                else: huidig[naam]=begin+regel-1
            i=m2.end(); continue
        i+=1
    return fouten


def cssControle(css, begin):
    """Losse declaraties buiten een regelblok, en blokken die nooit sluiten."""
    fouten=[]; d=0
    for i, r in enumerate(css.split("\n")):
        s=r.strip()
        if d==0 and s and not s.startswith("/*") and not s.startswith("*") \
           and "{" not in s and "}" not in s and ":" in s and s.endswith((";","}")):
            fouten.append("regel %d: losse css-declaratie zonder selector  ->  %s" % (begin+i, s[:90]))
        d += r.count("{") - r.count("}")
        if d < 0:
            fouten.append("regel %d: css heeft een } te veel" % (begin+i)); d = 0
    if d != 0:
        fouten.append("css eindigt met %+d openstaande blokken" % d)
    return fouten

def schoonVoorAnalyse(code):
    """Strings en commentaar leegmaken, regelnummers behouden."""
    uit=[]; i=0; n=len(code)
    while i<n:
        c=code[i]
        if c in "\"'`":
            q=c; i+=1
            while i<n:
                if code[i]=='\\': i+=2; continue
                if code[i]==q: i+=1; break
                if code[i]=='\n': uit.append('\n')
                i+=1
            uit.append('""'); continue
        if c=='/' and i+1<n and code[i+1]=='/':
            j=code.find('\n',i); i=n if j<0 else j; continue
        if c=='/' and i+1<n and code[i+1]=='*':
            j=code.find('*/',i); stuk=code[i:(n if j<0 else j+2)]
            uit.append('\n'*stuk.count('\n')); i=n if j<0 else j+2; continue
        uit.append(c); i+=1
    return "".join(uit)

def weesControle(code, begin):
    """Code op het hoogste niveau die geen verklaring of aanroep is: meestal
       het restant van een half verwijderde functie. Telt alle haakjessoorten,
       zodat regels binnen een array of aanroep niet meetellen."""
    schoon = schoonVoorAnalyse(code)
    fouten=[]; d=0
    START = re.compile(r'^(const|let|var|function|class|return|if|for|while|do|try|catch|switch|throw|export|import|new|delete|typeof|await|async)\b')
    for i, r in enumerate(schoon.split("\n")):
        s=r.strip()
        if d==0 and s and not s.startswith(("}", ")", "]", ".", ",", "?", ":", "&&", "||", "+", "-", "*", "=")):
            if START.match(s) is None \
               and re.match(r'^[A-Za-z_$][\w$.\[\]]*\s*[\(=]', s) is None:
                fouten.append("regel %d: losse code op hoogste niveau  ->  %s"
                              % (begin+i, code.split("\n")[i].strip()[:90]))
        d += (r.count("{")-r.count("}")) + (r.count("[")-r.count("]")) + (r.count("(")-r.count(")"))
    return fouten

def basisControles(code, begin, label):
    """De eerste vier controles (haakjesbalans, JSX/strings, dubbele
       verklaringen -- weesControle komt er later apart bij, want die
       loopt pas ná de CSS-controle in de oorspronkelijke volgorde).
       Genomen uit de hoofdstroom hieronder zodat dezelfde vier
       controles ook op elk bestand in src/kern/ kunnen draaien --
       sinds P2 (professionaliseringsplan.md) valt src/app.jsx daar
       voor een deel uiteen in, en een haakje dat daar wegvalt is
       even erg als een haakje dat in app.jsx wegvalt. jsxControle
       werkt gewoon door op een bestand zonder JSX: die vindt dan
       simpelweg niets, geen vals alarm."""
    fouten=[]
    voorvoegsel = (label+": ") if label else ""
    for o,c,nm in [('{','}','accolades'),('(',')','haakjes'),('[',']','blokhaken')]:
        d=code.count(o)-code.count(c)
        print(("OK  " if d==0 else "FOUT")+"  "+voorvoegsel+"%s: %+d"%(nm,d))
        if d: fouten.append("%s%s uit balans: %+d"%(voorvoegsel,nm,d))
    f1=jsxControle(code)
    print(("OK  " if not f1 else "FOUT")+"  "+voorvoegsel+"JSX en strings (%d regels)"%code.count("\n"))
    fouten += [voorvoegsel+x for x in f1]
    f2=dubbeleControle(code, begin)
    print(("OK  " if not f2 else "FOUT")+"  "+voorvoegsel+"dubbele verklaringen")
    fouten += [voorvoegsel+x for x in f2]
    f4=weesControle(code, begin)
    print(("OK  " if not f4 else "FOUT")+"  "+voorvoegsel+"losse coderesten")
    fouten += [voorvoegsel+x for x in f4]
    return fouten

html=open(BESTAND,encoding='utf-8').read()
m=re.search(r'<script type="text/babel">(.*?)</script>',html,re.S)
if m:
    # Een HTML-bestand met de JSX er rauw in: zo zag online/index.html
    # eruit tot de bouwstap, en zo zien de back-ups er nog uit. Blijft
    # werken, zodat je dit script op een oud bestand kunt loslaten.
    code=m.group(1); begin=html[:m.start(1)].count("\n")+1
else:
    # Sinds de bouwstap is de JSX een bestand op zichzelf: src/app.jsx.
    # Dan is er niets uit te knippen -- alles is code.
    code=html; begin=1
alles=[]
alles += basisControles(code, begin, "")
# De CSS staat niet bij de JSX. Sinds de bouwstap zit hij in het
# sjabloon src/index.html; in een oud bestand in hetzelfde bestand.
# Allebei blijven werken, want anders zou de css-controle stilletjes
# wegvallen zodra je hem op de bron loslaat -- en dat is precies het
# soort verdwenen controle waar dit script voor in het leven is geroepen.
mc=re.search(r'<style>(.*?)</style>', html, re.S)
if mc:
    f3=cssControle(mc.group(1), html[:mc.start(1)].count("\n")+1)
else:
    SJABLOON=os.path.join(os.path.dirname(HIER), "src", "index.html")
    if not os.path.exists(SJABLOON):
        print("FOUT  css-blokken: geen <style> in %s en geen src/index.html"%BESTAND)
        sys.exit(1)
    sjab=open(SJABLOON,encoding='utf-8').read()
    ms=re.search(r'<style>(.*?)</style>', sjab, re.S)
    if not ms:
        print("FOUT  css-blokken: geen <style> gevonden in src/index.html")
        sys.exit(1)
    f3=cssControle(ms.group(1), sjab[:ms.start(1)].count("\n")+1)
print(("OK  " if not f3 else "FOUT")+"  css-blokken")
alles += f3

# ── elke map onder src/ ─────────────────────────────────────────
# Sinds P2 (professionaliseringsplan.md, 16 september 2026) trekt
# app.jsx zijn "kern"-modules naar losse bestanden onder src/kern/,
# en sinds P3 komt daar src/domein/ bij. Allebei top-level
# function/const, precies als de rest van de app (geen import/export
# -- tools/bouw.js plakt ze aaneen), dus dezelfde vier controles
# gelden. In plaats van één vaste mapnaam op te noemen loopt dit over
# élke map direct onder src/ -- dan hoeft een volgende map (P4 zal er
# ongetwijfeld eentje brengen) hier niet apart bijgeschreven te
# worden, en is vergeten dat bij te werken geen manier meer om een
# nieuwe module buiten deze controle te houden. src/app.jsx en
# src/index.html zelf zijn losse bestanden, geen mappen, en vallen
# dus vanzelf buiten deze lus -- die worden hierboven al apart
# gecontroleerd.
#
# Sinds P4 (docs/p4-stappenplan.md, 17 september 2026) staat hier ook
# src/schermen/ -- en dat bevat, anders dan src/kern/ en src/domein/,
# .jsx-bestanden: React-componenten met JSX erin, in tegenstelling tot
# de kale JavaScript-modules van P2/P3. Zonder ".jsx" in de
# extensielijst hieronder zou dit script zo'n bestand stilzwijgend
# overslaan -- groen omdat er niets gecontroleerd werd, niet omdat
# alles in orde was. Precies het soort verdwenen controle waarvoor dit
# bestand oorspronkelijk is herschreven (zie de kop hierboven, over
# legacy/check.py dat naar het verkeerde bestand wees).
SRC_MAP = os.path.join(os.path.dirname(HIER), "src")
EXTENSIES = (".js", ".jsx")
if os.path.isdir(SRC_MAP):
    for submap in sorted(os.listdir(SRC_MAP)):
        subpad = os.path.join(SRC_MAP, submap)
        if not os.path.isdir(subpad): continue
        for naam in sorted(os.listdir(subpad)):
            if not naam.endswith(EXTENSIES): continue
            pad = os.path.join(subpad, naam)
            modulecode = open(pad, encoding='utf-8').read()
            alles += basisControles(modulecode, 1, "src/"+submap+"/"+naam)

# Deze controle op de bron zegt niets over wat er al naar Netlify is
# gesleept. Staat er een oudere online/index.html dan wat src/app.jsx nu
# oplevert -- bijvoorbeeld omdat iemand de bron aanpaste en vergat
# `node tools/bouw.js` te draaien -- dan is dat een uitrolfout die deze
# syntaxcontrole zelf niet ziet. Alleen zinvol als BESTAND de standaard
# bron is; wijst iemand check.py bewust naar een ander bestand (een
# back-up, bijvoorbeeld), dan zegt "verouderd" niets.
import subprocess
STANDAARD_BRON = os.path.join(os.path.dirname(HIER), "src", "app.jsx")
BOUWSCRIPT = os.path.join(HIER, "bouw.js")
if os.path.abspath(BESTAND) == os.path.abspath(STANDAARD_BRON) and os.path.exists(BOUWSCRIPT):
    r = subprocess.run(["node", BOUWSCRIPT, "--controleer"], capture_output=True, text=True)
    for regel in r.stdout.splitlines():
        print(regel)
    if r.returncode != 0:
        # r.stderr werd hier eerder nooit gelezen -- een crash in bouw.js
        # zelf (bijvoorbeeld een ontbrekende esbuild-installatie, zoals
        # in een verse checkout zonder "npm install --prefix tools")
        # kwam dan altijd binnen als hetzelfde misleidende "verouderd",
        # ook al had dat niets met src/app.jsx te maken. Zie de melding
        # hieronder pas als "verouderd" als bouw.js zelf niets op stderr
        # heeft gezet; anders is dat de echte reden.
        fout_stderr = r.stderr.strip()
        if fout_stderr:
            # De laatste regel van een Node-crash is meestal alleen het
            # versienummer ("Node.js v20.x.x"), niet de echte fout -- dat
            # bleek meteen bij de eerste keer dat dit pad echt afging
            # (ontbrekende esbuild-installatie meldde zich als "Node.js
            # v24.21.0", onbruikbaar). Zoek in plaats daarvan de eerste
            # regel die op een JS-foutmelding lijkt ("Error: ...", of een
            # eigen foutklasse zoals "TypeError:"); val terug op de
            # laatste regel als zo'n patroon nergens voorkomt.
            regels = fout_stderr.splitlines()
            echte_regel = next((r2 for r2 in regels if re.match(r'^\s*\w*Error:', r2)), regels[-1])
            alles.append("de bouw-actualiteitscontrole kon niet draaien -- " + echte_regel.strip())
        else:
            alles.append("online/index.html is verouderd t.o.v. src/app.jsx -- draai node tools/bouw.js")
print()
if alles:
    for x in alles[:15]: print("  FOUT  "+x)
    sys.exit(1)
print("Alles in orde.")
