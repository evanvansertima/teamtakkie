# -*- coding: utf-8 -*-
"""Controleert fc-harlingen-app.html voor het wordt opgeleverd:
   1. balans van accolades, haakjes en blokhaken
   2. JSX-nesting (met JS/JSX-contextwissel, zodat apostrofs in tekst geen vals alarm geven)
   3. strings die niet op dezelfde regel worden gesloten
   4. dubbele const/let/function binnen hetzelfde blok
Draai met: python3 .controle/check.py"""
import re, sys, os
BESTAND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "fc-harlingen-app.html")
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

html=open(BESTAND,encoding='utf-8').read()
m=re.search(r'<script type="text/babel">(.*?)</script>',html,re.S)
code=m.group(1); begin=html[:m.start(1)].count("\n")+1
alles=[]
for o,c,nm in [('{','}','accolades'),('(',')','haakjes'),('[',']','blokhaken')]:
    d=code.count(o)-code.count(c)
    print(("OK  " if d==0 else "FOUT")+"  %s: %+d"%(nm,d))
    if d: alles.append("%s uit balans: %+d"%(nm,d))
f1=jsxControle(code)
print(("OK  " if not f1 else "FOUT")+"  JSX en strings (%d regels)"%code.count("\n"))
alles += f1
f2=dubbeleControle(code, begin)
print(("OK  " if not f2 else "FOUT")+"  dubbele verklaringen")
alles += f2
mc=re.search(r'<style>(.*?)</style>', html, re.S)
f3=cssControle(mc.group(1), html[:mc.start(1)].count("\n")+1)
print(("OK  " if not f3 else "FOUT")+"  css-blokken")
alles += f3
f4=weesControle(code, begin)
print(("OK  " if not f4 else "FOUT")+"  losse coderesten")
alles += f4
print()
if alles:
    for x in alles[:15]: print("  FOUT  "+x)
    sys.exit(1)
print("Alles in orde.")
